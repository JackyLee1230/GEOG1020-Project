export type AlertLevel = 'green' | 'yellow' | 'orange' | 'red' | null;

export interface EarthquakeMetadata {
  generated: number;
  url: string;
  title: string;
  status: number;
  api: string;
  count: number;
}

export interface EarthquakeGeometry {
  type: 'Point';
  coordinates: [number, number, number];
}

export interface EarthquakeProperties {
  mag: number | null;
  place: string;
  time: number;
  updated: number;
  tz: number | null;
  url: string;
  detail: string;
  felt: number | null;
  cdi: number | null;
  mmi: number | null;
  alert: AlertLevel;
  status: string;
  tsunami: 0 | 1;
  sig: number;
  net: string;
  code: string;
  ids: string;
  sources: string;
  types: string;
  nst: number | null;
  dmin: number | null;
  rms: number | null;
  gap: number | null;
  magType: string;
  type: string;
  title: string;
}

export interface EarthquakeFeature {
  type: 'Feature';
  id: string;
  properties: EarthquakeProperties;
  geometry: EarthquakeGeometry;
}

export interface EarthquakeFeed {
  type: 'FeatureCollection';
  metadata: EarthquakeMetadata;
  features: EarthquakeFeature[];
  bbox?: number[];
}

export type EarthquakeSort =
  | 'latest'
  | 'oldest'
  | 'strongest'
  | 'weakest'
  | 'deepest'
  | 'shallowest';

export interface EarthquakeFilters {
  searchQuery: string;
  selectedRegion: string;
  minMagnitude: number;
  tsunamiOnly: boolean;
  sortBy: EarthquakeSort;
}

export interface BucketCount {
  label: string;
  count: number;
}

export interface RegionCount {
  region: string;
  count: number;
}

export interface EarthquakeAnalytics {
  total: number;
  averageMagnitude: number;
  maxMagnitude: number;
  minMagnitude: number;
  deepestKm: number;
  shallowestKm: number;
  tsunamiEvents: number;
  feltReportsTotal: number;
  significantEvents: number;
  alertEvents: number;
  byDay: BucketCount[];
  byMagnitude: BucketCount[];
  byDepth: BucketCount[];
  byAlert: BucketCount[];
  topRegions: RegionCount[];
}
