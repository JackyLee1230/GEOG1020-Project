import {
  EarthquakeAnalytics,
  EarthquakeFeature,
  EarthquakeFilters,
  EarthquakeSort,
  RegionCount
} from '../types/earthquake';

export const toISODateNDaysAgo = (days: number): string => {
  const now = new Date();
  const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return from.toISOString().slice(0, 10);
};

export const toISODateNow = (): string => new Date().toISOString().slice(0, 10);

export const extractRegion = (place: string): string => {
  if (!place) return 'Unknown';
  const segments = place.split(',').map((item) => item.trim()).filter(Boolean);
  if (!segments.length) return 'Unknown';
  return segments[segments.length - 1].replace(/\bregion\b/gi, '').trim() || 'Unknown';
};

export const getDepthKm = (feature: EarthquakeFeature): number => {
  const [, , depth] = feature.geometry.coordinates;
  return Number.isFinite(depth) ? depth : 0;
};

export const getMagnitude = (feature: EarthquakeFeature): number => {
  const mag = feature.properties.mag;
  return typeof mag === 'number' && Number.isFinite(mag) ? mag : 0;
};

export const formatHKT = (time: number): string => {
  return new Intl.DateTimeFormat('en-HK', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Hong_Kong'
  }).format(new Date(time));
};

export const getMagnitudeColor = (magnitude: number): string => {
  if (magnitude < 1) return '#69d7c6';
  if (magnitude < 2) return '#66d67d';
  if (magnitude < 3) return '#96cf51';
  if (magnitude < 4) return '#c1c949';
  if (magnitude < 5) return '#d5b34f';
  if (magnitude < 6) return '#d38f45';
  if (magnitude < 7) return '#d06633';
  if (magnitude < 8) return '#ce3f21';
  if (magnitude < 9) return '#c70f15';
  return '#9f0010';
};

export const getMagnitudeRadius = (magnitude: number): number => {
  return Math.max(4, magnitude * 3.1);
};

export const getDepthCategory = (depth: number): string => {
  if (depth <= 70) return 'Shallow (<= 70km)';
  if (depth <= 300) return 'Intermediate (70-300km)';
  return 'Deep (> 300km)';
};

const magnitudeBucketLabel = (mag: number): string => {
  if (mag >= 9) return '9+';
  const start = Math.floor(Math.max(mag, 0));
  return `${start}-${start + 1}`;
};

export const createEarthquakeAnalytics = (
  features: EarthquakeFeature[]
): EarthquakeAnalytics => {
  if (!features.length) {
    return {
      total: 0,
      averageMagnitude: 0,
      maxMagnitude: 0,
      minMagnitude: 0,
      deepestKm: 0,
      shallowestKm: 0,
      tsunamiEvents: 0,
      feltReportsTotal: 0,
      significantEvents: 0,
      alertEvents: 0,
      byDay: [],
      byMagnitude: [],
      byDepth: [],
      byAlert: [],
      topRegions: []
    };
  }

  const byDay = new Map<string, number>();
  const byMagnitude = new Map<string, number>();
  const byDepth = new Map<string, number>();
  const byAlert = new Map<string, number>();
  const byRegion = new Map<string, number>();

  let magnitudeSum = 0;
  let maxMagnitude = Number.NEGATIVE_INFINITY;
  let minMagnitude = Number.POSITIVE_INFINITY;
  let deepestKm = Number.NEGATIVE_INFINITY;
  let shallowestKm = Number.POSITIVE_INFINITY;
  let tsunamiEvents = 0;
  let feltReportsTotal = 0;
  let significantEvents = 0;
  let alertEvents = 0;

  features.forEach((feature) => {
    const magnitude = getMagnitude(feature);
    const depthKm = getDepthKm(feature);
    const region = extractRegion(feature.properties.place);

    const dayLabel = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'UTC'
    }).format(new Date(feature.properties.time));

    byDay.set(dayLabel, (byDay.get(dayLabel) ?? 0) + 1);

    const magLabel = magnitudeBucketLabel(magnitude);
    byMagnitude.set(magLabel, (byMagnitude.get(magLabel) ?? 0) + 1);

    const depthLabel = getDepthCategory(depthKm);
    byDepth.set(depthLabel, (byDepth.get(depthLabel) ?? 0) + 1);

    const alertLabel = feature.properties.alert ?? 'none';
    byAlert.set(alertLabel, (byAlert.get(alertLabel) ?? 0) + 1);

    byRegion.set(region, (byRegion.get(region) ?? 0) + 1);

    magnitudeSum += magnitude;
    maxMagnitude = Math.max(maxMagnitude, magnitude);
    minMagnitude = Math.min(minMagnitude, magnitude);
    deepestKm = Math.max(deepestKm, depthKm);
    shallowestKm = Math.min(shallowestKm, depthKm);

    if (feature.properties.tsunami === 1) tsunamiEvents += 1;
    if (feature.properties.felt) feltReportsTotal += feature.properties.felt;
    if (feature.properties.sig >= 600) significantEvents += 1;
    if (feature.properties.alert) alertEvents += 1;
  });

  const sortedByDay = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, count]) => ({ label, count }));

  const sortedMagnitudeBuckets = ['0-1', '1-2', '2-3', '3-4', '4-5', '5-6', '6-7', '7-8', '8-9', '9+'].map((label) => ({
    label,
    count: byMagnitude.get(label) ?? 0
  }));

  const depthLabels = ['Shallow (<= 70km)', 'Intermediate (70-300km)', 'Deep (> 300km)'];
  const sortedDepthBuckets = depthLabels.map((label) => ({
    label,
    count: byDepth.get(label) ?? 0
  }));

  const alertOrder = ['green', 'yellow', 'orange', 'red', 'none'];
  const sortedAlerts = alertOrder.map((label) => ({
    label,
    count: byAlert.get(label) ?? 0
  }));

  const topRegions: RegionCount[] = [...byRegion.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([region, count]) => ({ region, count }));

  return {
    total: features.length,
    averageMagnitude: magnitudeSum / features.length,
    maxMagnitude,
    minMagnitude,
    deepestKm,
    shallowestKm,
    tsunamiEvents,
    feltReportsTotal,
    significantEvents,
    alertEvents,
    byDay: sortedByDay,
    byMagnitude: sortedMagnitudeBuckets,
    byDepth: sortedDepthBuckets,
    byAlert: sortedAlerts,
    topRegions
  };
};

const compareFeatures = (sortBy: EarthquakeSort) => {
  return (a: EarthquakeFeature, b: EarthquakeFeature) => {
    switch (sortBy) {
      case 'oldest':
        return a.properties.time - b.properties.time;
      case 'strongest':
        return getMagnitude(b) - getMagnitude(a);
      case 'weakest':
        return getMagnitude(a) - getMagnitude(b);
      case 'deepest':
        return getDepthKm(b) - getDepthKm(a);
      case 'shallowest':
        return getDepthKm(a) - getDepthKm(b);
      case 'latest':
      default:
        return b.properties.time - a.properties.time;
    }
  };
};

export const filterAndSortEarthquakes = (
  features: EarthquakeFeature[],
  filters: EarthquakeFilters
): EarthquakeFeature[] => {
  const query = filters.searchQuery.trim().toLowerCase();

  return features
    .filter((feature) => {
      const magnitude = getMagnitude(feature);
      const region = extractRegion(feature.properties.place);
      const place = (feature.properties.place ?? '').toLowerCase();

      if (magnitude < filters.minMagnitude) return false;
      if (filters.tsunamiOnly && feature.properties.tsunami !== 1) return false;
      if (filters.selectedRegion !== 'all' && region !== filters.selectedRegion) return false;
      if (query && !place.includes(query)) return false;

      return true;
    })
    .sort(compareFeatures(filters.sortBy));
};

export const toEarthquakeCSV = (features: EarthquakeFeature[]): string => {
  const header = [
    'id',
    'time_hkt',
    'magnitude',
    'depth_km',
    'place',
    'region',
    'source',
    'source_count',
    'confidence_score',
    'alert',
    'tsunami',
    'felt',
    'significance',
    'usgs_url',
    'latitude',
    'longitude'
  ];

  const rows = features.map((feature) => {
    const [longitude, latitude, depth] = feature.geometry.coordinates;

    return [
      feature.id,
      formatHKT(feature.properties.time),
      getMagnitude(feature).toFixed(1),
      depth.toFixed(1),
      `"${(feature.properties.place || '').replace(/"/g, '""')}"`,
      `"${extractRegion(feature.properties.place).replace(/"/g, '""')}"`,
      feature.properties.source ?? 'usgs',
      feature.properties.sourceContributors?.length ?? 1,
      Math.round(feature.properties.confidenceScore ?? 0),
      feature.properties.alert ?? 'none',
      feature.properties.tsunami,
      feature.properties.felt ?? 0,
      feature.properties.sig,
      feature.properties.url,
      latitude,
      longitude
    ].join(',');
  });

  return [header.join(','), ...rows].join('\n');
};
