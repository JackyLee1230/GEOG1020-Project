import axios from 'axios';
import { EarthquakeFeed, EarthquakeFeature } from '../types/earthquake';

interface GetEarthquakesParams {
  startTime: string;
  endTime: string;
  minMagnitude?: number;
  limit?: number;
}

const ENDPOINT = 'https://earthquake.usgs.gov/fdsnws/event/1/query';

const hasValidGeometry = (feature: EarthquakeFeature): boolean => {
  return (
    Array.isArray(feature.geometry.coordinates) &&
    feature.geometry.coordinates.length >= 3 &&
    Number.isFinite(feature.geometry.coordinates[0]) &&
    Number.isFinite(feature.geometry.coordinates[1]) &&
    Number.isFinite(feature.geometry.coordinates[2])
  );
};

export const getEarthquakes = async ({
  startTime,
  endTime,
  minMagnitude = 0,
  limit = 20000
}: GetEarthquakesParams): Promise<EarthquakeFeed> => {
  const response = await axios.get<EarthquakeFeed>(ENDPOINT, {
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

  const features = (response.data.features ?? []).filter(hasValidGeometry);

  return {
    ...response.data,
    features
  };
};
