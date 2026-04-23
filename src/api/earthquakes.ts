import axios from 'axios';
import {
  EarthquakeFeed,
  EarthquakeFeature,
  EarthquakeSource
} from '../types/earthquake';

interface GetEarthquakesParams {
  startTime: string;
  endTime: string;
  minMagnitude?: number;
  limit?: number;
}

interface GeoNetFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: number[];
  };
  properties: {
    publicID?: string;
    time?: string;
    depth?: number;
    magnitude?: number;
    mmi?: number;
    locality?: string;
    quality?: string;
  };
}

interface GeoNetResponse {
  type: 'FeatureCollection';
  features: GeoNetFeature[];
}

interface SourceFetchResult {
  source: EarthquakeSource;
  features: EarthquakeFeature[];
  error?: string;
}

interface EventCluster {
  features: EarthquakeFeature[];
  centroidTime: number;
  centroidLatitude: number;
  centroidLongitude: number;
  centroidMagnitude: number;
}

const USGS_ENDPOINT = 'https://earthquake.usgs.gov/fdsnws/event/1/query';
const GEONET_ENDPOINT = 'https://api.geonet.org.nz/quake';
const GEOFON_ENDPOINT = 'https://geofon.gfz.de/fdsnws/event/1/query';

const SOURCE_WEIGHTS: Record<EarthquakeSource, number> = {
  usgs: 3,
  geofon: 2,
  geonet: 1
};

const EARTH_RADIUS_KM = 6371;
const CLUSTER_TIME_WINDOW_MS = 3 * 60 * 1000;
const CLUSTER_DISTANCE_KM = 120;
const CLUSTER_MAGNITUDE_DIFF = 0.8;
const TIME_BUCKET_MINUTES = 1;
const TIME_BUCKET_LOOKUP_RADIUS = 3;

const toWindowStartMs = (value: string): number => Date.parse(`${value}T00:00:00Z`);
const toWindowEndMs = (value: string): number => Date.parse(`${value}T23:59:59.999Z`);

const parseOptionalNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

const normaliseSourceUrl = (
  source: EarthquakeSource,
  eventId: string,
  fallbackUrl?: string
): string => {
  if (fallbackUrl) return fallbackUrl;

  if (source === 'geonet') {
    return `https://www.geonet.org.nz/earthquake/${eventId}`;
  }

  if (source === 'geofon') {
    return `https://geofon.gfz.de/eqinfo/event.php?id=${eventId}`;
  }

  return `https://earthquake.usgs.gov/earthquakes/eventpage/${eventId}`;
};

const buildEventTitle = (
  magnitude: number | null,
  place: string,
  source: EarthquakeSource
): string => {
  const sourceLabel = source.toUpperCase();
  const magnitudeLabel = magnitude !== null ? magnitude.toFixed(1) : 'N/A';
  return `M ${magnitudeLabel} - ${place} (${sourceLabel})`;
};

const hasValidGeometry = (feature: EarthquakeFeature): boolean => {
  return (
    Array.isArray(feature.geometry.coordinates) &&
    feature.geometry.coordinates.length >= 3 &&
    Number.isFinite(feature.geometry.coordinates[0]) &&
    Number.isFinite(feature.geometry.coordinates[1]) &&
    Number.isFinite(feature.geometry.coordinates[2])
  );
};

const toSourceTaggedFeature = (
  feature: EarthquakeFeature,
  source: EarthquakeSource,
  eventUrl?: string
): EarthquakeFeature => {
  const resolvedUrl = normaliseSourceUrl(source, feature.id, eventUrl ?? feature.properties.url);

  return {
    ...feature,
    properties: {
      ...feature.properties,
      url: resolvedUrl,
      detail: feature.properties.detail || resolvedUrl,
      source,
      sourceContributors: [source],
      sourceEventUrl: resolvedUrl,
      confidenceScore: feature.properties.confidenceScore ?? 0
    }
  };
};

const sourceCountFromFeatures = (features: EarthquakeFeature[]): EarthquakeSource[] => {
  return Array.from(
    new Set(
      features
        .map((feature) => feature.properties.source)
        .filter((source): source is EarthquakeSource => Boolean(source))
    )
  );
};

const haversineDistanceKm = (
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number
): number => {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latDelta = toRadians(latitudeB - latitudeA);
  const lonDelta = toRadians(longitudeB - longitudeA);
  const latARad = toRadians(latitudeA);
  const latBRad = toRadians(latitudeB);

  const value =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(latARad) * Math.cos(latBRad) * Math.sin(lonDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
};

const countRichMetadataFields = (feature: EarthquakeFeature): number => {
  const candidates = [
    feature.properties.nst,
    feature.properties.dmin,
    feature.properties.rms,
    feature.properties.gap,
    feature.properties.felt,
    feature.properties.mmi,
    feature.properties.alert
  ];

  return candidates.reduce((count, value) => (value !== null ? count + 1 : count), 0);
};

const createCluster = (feature: EarthquakeFeature): EventCluster => {
  const [longitude, latitude] = feature.geometry.coordinates;

  return {
    features: [feature],
    centroidTime: feature.properties.time,
    centroidLatitude: latitude,
    centroidLongitude: longitude,
    centroidMagnitude: feature.properties.mag ?? 0
  };
};

const updateClusterCentroid = (
  cluster: EventCluster,
  feature: EarthquakeFeature
): EventCluster => {
  const [longitude, latitude] = feature.geometry.coordinates;
  const nextCount = cluster.features.length + 1;
  const magnitude = feature.properties.mag ?? 0;

  return {
    ...cluster,
    features: [...cluster.features, feature],
    centroidTime:
      (cluster.centroidTime * cluster.features.length + feature.properties.time) / nextCount,
    centroidLatitude:
      (cluster.centroidLatitude * cluster.features.length + latitude) / nextCount,
    centroidLongitude:
      (cluster.centroidLongitude * cluster.features.length + longitude) / nextCount,
    centroidMagnitude:
      (cluster.centroidMagnitude * cluster.features.length + magnitude) / nextCount
  };
};

const isLikelySameEvent = (feature: EarthquakeFeature, cluster: EventCluster): boolean => {
  const [longitude, latitude] = feature.geometry.coordinates;

  const timeDiff = Math.abs(feature.properties.time - cluster.centroidTime);
  if (timeDiff > CLUSTER_TIME_WINDOW_MS) return false;

  const distanceKm = haversineDistanceKm(
    latitude,
    longitude,
    cluster.centroidLatitude,
    cluster.centroidLongitude
  );
  if (distanceKm > CLUSTER_DISTANCE_KM) return false;

  const magnitude = feature.properties.mag;
  if (magnitude !== null) {
    const magDiff = Math.abs(magnitude - cluster.centroidMagnitude);
    if (magDiff > CLUSTER_MAGNITUDE_DIFF) return false;
  }

  return true;
};

const pickRepresentativeFeature = (features: EarthquakeFeature[]): EarthquakeFeature => {
  const sorted = [...features].sort((left, right) => {
    const leftSource = left.properties.source ?? 'usgs';
    const rightSource = right.properties.source ?? 'usgs';
    const leftScore = SOURCE_WEIGHTS[leftSource] * 10 + countRichMetadataFields(left);
    const rightScore = SOURCE_WEIGHTS[rightSource] * 10 + countRichMetadataFields(right);

    if (leftScore === rightScore) {
      return right.properties.updated - left.properties.updated;
    }

    return rightScore - leftScore;
  });

  return sorted[0];
};

const scoreClusterConfidence = (
  representative: EarthquakeFeature,
  members: EarthquakeFeature[],
  contributorCount: number
): number => {
  if (!members.length) return 0;

  const memberTimes = members.map((member) => member.properties.time);
  const maxTime = Math.max(...memberTimes);
  const minTime = Math.min(...memberTimes);
  const timeSpreadMinutes = (maxTime - minTime) / (1000 * 60);

  const [repLon, repLat] = representative.geometry.coordinates;
  const maxDistanceFromRepresentative = members.reduce((maxDistance, member) => {
    const [memberLon, memberLat] = member.geometry.coordinates;
    const distance = haversineDistanceKm(repLat, repLon, memberLat, memberLon);
    return Math.max(maxDistance, distance);
  }, 0);

  const averageMetadataRichness =
    members.reduce((sum, member) => sum + countRichMetadataFields(member), 0) /
    (members.length * 7);

  const rawScore =
    45 +
    contributorCount * 18 +
    averageMetadataRichness * 18 -
    Math.min(12, timeSpreadMinutes * 2) -
    Math.min(10, maxDistanceFromRepresentative / 30);

  return Math.round(clamp(rawScore, 20, 99));
};

const mergeClusterToFeature = (cluster: EventCluster): EarthquakeFeature => {
  const representative = pickRepresentativeFeature(cluster.features);
  const contributors = sourceCountFromFeatures(cluster.features);
  const mergedIds = cluster.features.map((item) => item.id).join(',');
  const mergedSources = contributors.join(',');
  const confidence = scoreClusterConfidence(
    representative,
    cluster.features,
    contributors.length
  );

  return {
    ...representative,
    properties: {
      ...representative.properties,
      ids: mergedIds || representative.properties.ids,
      sources: mergedSources || representative.properties.sources,
      sourceContributors: contributors,
      confidenceScore: confidence,
      sourceEventUrl:
        representative.properties.sourceEventUrl ??
        normaliseSourceUrl(
          representative.properties.source ?? 'usgs',
          representative.id,
          representative.properties.url
        ),
      title:
        representative.properties.title ||
        buildEventTitle(
          representative.properties.mag,
          representative.properties.place,
          representative.properties.source ?? 'usgs'
        )
    }
  };
};

const deduplicateEvents = (features: EarthquakeFeature[]): EarthquakeFeature[] => {
  if (!features.length) return [];

  const sorted = [...features].sort((left, right) => right.properties.time - left.properties.time);
  const clusters: EventCluster[] = [];
  const timeBuckets = new Map<number, number[]>();

  sorted.forEach((feature) => {
    const bucket = Math.floor(feature.properties.time / (1000 * 60 * TIME_BUCKET_MINUTES));
    const candidateClusterIndexes = new Set<number>();

    for (
      let offset = -TIME_BUCKET_LOOKUP_RADIUS;
      offset <= TIME_BUCKET_LOOKUP_RADIUS;
      offset += 1
    ) {
      const bucketIndexes = timeBuckets.get(bucket + offset) ?? [];
      bucketIndexes.forEach((index) => candidateClusterIndexes.add(index));
    }

    let matchedClusterIndex: number | null = null;

    candidateClusterIndexes.forEach((clusterIndex) => {
      if (matchedClusterIndex !== null) return;

      const candidate = clusters[clusterIndex];
      if (candidate && isLikelySameEvent(feature, candidate)) {
        matchedClusterIndex = clusterIndex;
      }
    });

    if (matchedClusterIndex === null) {
      clusters.push(createCluster(feature));
      const nextIndex = clusters.length - 1;
      const existing = timeBuckets.get(bucket) ?? [];
      timeBuckets.set(bucket, [...existing, nextIndex]);
      return;
    }

    const merged = updateClusterCentroid(clusters[matchedClusterIndex], feature);
    clusters[matchedClusterIndex] = merged;
  });

  return clusters
    .map(mergeClusterToFeature)
    .filter(hasValidGeometry)
    .sort((left, right) => right.properties.time - left.properties.time);
};

const fetchUSGSFeed = async ({
  startTime,
  endTime,
  minMagnitude,
  limit
}: GetEarthquakesParams): Promise<EarthquakeFeature[]> => {
  const response = await axios.get<EarthquakeFeed>(USGS_ENDPOINT, {
    params: {
      format: 'geojson',
      starttime: startTime,
      endtime: endTime,
      minmagnitude: minMagnitude,
      orderby: 'time',
      limit
    },
    timeout: 30000
  });

  return (response.data.features ?? [])
    .filter(hasValidGeometry)
    .map((feature) => toSourceTaggedFeature(feature, 'usgs'));
};

const mapGeoNetFeature = (
  feature: GeoNetFeature,
  startWindowMs: number,
  endWindowMs: number,
  minMagnitude: number
): EarthquakeFeature | null => {
  const [longitude, latitude] = feature.geometry.coordinates;
  const magnitude = parseOptionalNumber(feature.properties.magnitude);
  const time = Date.parse(feature.properties.time ?? '');
  const depth =
    parseOptionalNumber(feature.geometry.coordinates[2]) ??
    parseOptionalNumber(feature.properties.depth) ??
    0;

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (!Number.isFinite(time) || time < startWindowMs || time > endWindowMs) return null;
  if (magnitude === null || magnitude < minMagnitude) return null;

  const eventId = feature.properties.publicID ?? `geonet-${time}`;
  const place = feature.properties.locality?.trim() || 'New Zealand';
  const sourceUrl = normaliseSourceUrl('geonet', eventId);
  const mmi = parseOptionalNumber(feature.properties.mmi);
  const significance = Math.round(magnitude * 100 + (mmi ?? 0) * 20);

  return {
    type: 'Feature',
    id: `geonet-${eventId}`,
    geometry: {
      type: 'Point',
      coordinates: [longitude, latitude, depth]
    },
    properties: {
      mag: magnitude,
      place,
      time,
      updated: time,
      tz: null,
      url: sourceUrl,
      detail: sourceUrl,
      felt: null,
      cdi: null,
      mmi,
      alert: null,
      status: feature.properties.quality || 'automatic',
      tsunami: 0,
      sig: significance,
      net: 'nz',
      code: eventId,
      ids: eventId,
      sources: 'geonet',
      types: 'origin,magnitude',
      nst: null,
      dmin: null,
      rms: null,
      gap: null,
      magType: 'ml',
      type: 'earthquake',
      title: buildEventTitle(magnitude, place, 'geonet'),
      source: 'geonet',
      sourceContributors: ['geonet'],
      confidenceScore: 0,
      sourceEventUrl: sourceUrl
    }
  };
};

const fetchGeoNetFeed = async ({
  startTime,
  endTime,
  minMagnitude
}: GetEarthquakesParams): Promise<EarthquakeFeature[]> => {
  const response = await axios.get<GeoNetResponse>(GEONET_ENDPOINT, {
    params: {
      MMI: 0
    },
    timeout: 30000
  });

  const startWindowMs = toWindowStartMs(startTime);
  const endWindowMs = toWindowEndMs(endTime);

  return (response.data.features ?? [])
    .map((feature) => mapGeoNetFeature(feature, startWindowMs, endWindowMs, minMagnitude ?? 0))
    .filter((feature): feature is EarthquakeFeature => Boolean(feature))
    .filter(hasValidGeometry);
};

const parseFDSNTextRows = (payload: string): string[][] => {
  if (!payload) return [];

  return payload
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => line.split('|'));
};

const mapGEOFONRow = (columns: string[]): EarthquakeFeature | null => {
  if (columns.length < 13) return null;

  const eventId = columns[0]?.trim();
  const time = Date.parse(columns[1] ?? '');
  const latitude = Number(columns[2]);
  const longitude = Number(columns[3]);
  const depth = Number(columns[4]);
  const magType = columns[9]?.trim() || 'm';
  const magnitude = parseOptionalNumber(columns[10]);
  const place = columns[12]?.trim() || 'Unknown location';
  const eventType = columns[13]?.trim() || 'earthquake';

  if (!eventId || !Number.isFinite(time)) return null;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(depth)) {
    return null;
  }

  const sourceUrl = normaliseSourceUrl('geofon', eventId);

  return {
    type: 'Feature',
    id: `geofon-${eventId}`,
    geometry: {
      type: 'Point',
      coordinates: [longitude, latitude, depth]
    },
    properties: {
      mag: magnitude,
      place,
      time,
      updated: time,
      tz: null,
      url: sourceUrl,
      detail: sourceUrl,
      felt: null,
      cdi: null,
      mmi: null,
      alert: null,
      status: 'automatic',
      tsunami: 0,
      sig: Math.round((magnitude ?? 0) * 100),
      net: 'gfz',
      code: eventId,
      ids: eventId,
      sources: 'geofon',
      types: 'origin,magnitude',
      nst: null,
      dmin: null,
      rms: null,
      gap: null,
      magType,
      type: eventType,
      title: buildEventTitle(magnitude, place, 'geofon'),
      source: 'geofon',
      sourceContributors: ['geofon'],
      confidenceScore: 0,
      sourceEventUrl: sourceUrl
    }
  };
};

const fetchGEOFONFeed = async ({
  startTime,
  endTime,
  minMagnitude,
  limit
}: GetEarthquakesParams): Promise<EarthquakeFeature[]> => {
  const response = await axios.get<string>(GEOFON_ENDPOINT, {
    params: {
      format: 'text',
      starttime: startTime,
      endtime: endTime,
      minmagnitude: minMagnitude,
      limit,
      orderby: 'time'
    },
    responseType: 'text',
    timeout: 30000
  });

  return parseFDSNTextRows(response.data)
    .map(mapGEOFONRow)
    .filter((feature): feature is EarthquakeFeature => Boolean(feature))
    .filter((feature) => {
      const magnitude = feature.properties.mag;
      return magnitude !== null && magnitude >= (minMagnitude ?? 0);
    })
    .filter(hasValidGeometry);
};

const fetchSourceSafe = async (
  source: EarthquakeSource,
  action: () => Promise<EarthquakeFeature[]>
): Promise<SourceFetchResult> => {
  try {
    const features = await action();
    return { source, features };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown source error';
    return { source, features: [], error: message };
  }
};

const buildCombinedMetadata = (
  sourceResults: SourceFetchResult[],
  dedupedCount: number
): EarthquakeFeed['metadata'] => {
  const providerCounts = sourceResults.reduce<
    Partial<Record<EarthquakeSource, number>>
  >((counts, result) => {
    counts[result.source] = result.features.length;
    return counts;
  }, {});

  const providers = sourceResults
    .filter((result) => result.features.length > 0)
    .map((result) => result.source);

  const dedupedFrom = sourceResults.reduce(
    (sum, result) => sum + result.features.length,
    0
  );

  const warnings = sourceResults
    .filter((result) => result.error)
    .map((result) => `${result.source.toUpperCase()}: ${result.error}`);

  return {
    generated: Date.now(),
    url: USGS_ENDPOINT,
    title: 'Multi-source seismic feed (USGS + GeoNet + GEOFON)',
    status: warnings.length ? 206 : 200,
    api: 'multisource-v1',
    count: dedupedCount,
    providers,
    providerCounts,
    dedupedFrom,
    warnings
  };
};

export const getEarthquakes = async ({
  startTime,
  endTime,
  minMagnitude = 0,
  limit = 20000
}: GetEarthquakesParams): Promise<EarthquakeFeed> => {
  const startWindowMs = toWindowStartMs(startTime);
  const endWindowMs = toWindowEndMs(endTime);

  if (!Number.isFinite(startWindowMs) || !Number.isFinite(endWindowMs)) {
    throw new Error('Invalid time window provided for earthquake query.');
  }

  const [usgsResult, geonetResult, geofonResult] = await Promise.all([
    fetchSourceSafe('usgs', async () =>
      fetchUSGSFeed({ startTime, endTime, minMagnitude, limit })
    ),
    fetchSourceSafe('geonet', async () =>
      fetchGeoNetFeed({ startTime, endTime, minMagnitude, limit })
    ),
    fetchSourceSafe('geofon', async () =>
      fetchGEOFONFeed({ startTime, endTime, minMagnitude, limit })
    )
  ]);

  const sourceResults = [usgsResult, geonetResult, geofonResult];

  const allFeatures = sourceResults
    .flatMap((result) => result.features)
    .map((feature) =>
      toSourceTaggedFeature(
        feature,
        feature.properties.source ?? 'usgs',
        feature.properties.sourceEventUrl
      )
    )
    .filter(hasValidGeometry)
    .filter((feature) => {
      const time = feature.properties.time;
      return time >= startWindowMs && time <= endWindowMs;
    });

  if (!allFeatures.length) {
    const errors = sourceResults
      .filter((result) => result.error)
      .map((result) => `${result.source.toUpperCase()}: ${result.error}`);

    if (errors.length) {
      throw new Error(`All earthquake feeds failed. ${errors.join(' | ')}`);
    }

    throw new Error('No earthquake events available for the selected filters.');
  }

  const deduplicatedFeatures = deduplicateEvents(allFeatures);

  return {
    type: 'FeatureCollection',
    metadata: buildCombinedMetadata(sourceResults, deduplicatedFeatures.length),
    features: deduplicatedFeatures
  };
};
