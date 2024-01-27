/* eslint-disable dot-notation */
import { useEffect } from 'react';
import L, { LatLng, GeoJSON, Layer } from 'leaflet';
import { useMap } from 'react-leaflet';
import { useQuery } from '@tanstack/react-query';
import { getEarthquakes } from '../../api/earthquakes';
import { useStore } from '../../hooks';

const markerColorByMagnitude = (magnitude: number): string => {
  const magColors: string[] = [
    '#6FCCB4',
    '#68D275',
    '#95D058',
    '#C2CC49',
    '#CCB659',
    '#C69344',
    '#C6652B',
    '#CD3217',
    '#CC0103',
    'red'
  ];
  if (magnitude <= 1) return magColors[0];
  if (magnitude > 1 && magnitude <= 2) return magColors[1];
  if (magnitude > 2 && magnitude <= 3) return magColors[2];
  if (magnitude > 3 && magnitude <= 4) return magColors[3];
  if (magnitude > 4 && magnitude <= 5) return magColors[4];
  if (magnitude > 5 && magnitude <= 6) return magColors[5];
  if (magnitude > 6 && magnitude <= 7) return magColors[6];
  if (magnitude > 7 && magnitude <= 8) return magColors[7];
  if (magnitude > 8 && magnitude <= 9) return magColors[8];
  return magColors[9];
};

const createMarker = (magnitude: number): Object => ({
  radius: 2.5 * magnitude,
  fillColor: markerColorByMagnitude(magnitude),
  color: 'grey',
  weight: 2,
  opacity: 1,
  fillOpacity: 0.9
});

export interface FeatureProps {
  geometry: any;
  properties: {
    mag: number;
    place: string;
    time: number;
    url: string;
    title: string;
  };
  type: string;
}

const timeConverterToHKT = (time: number): string => {
  const d = new Date(time);
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const nd = new Date(utc + 3600000 * 8);
  return nd.toLocaleString();
};

const onEachFeature = (feature: FeatureProps, layer: Layer) => {
  const {
    properties: { title, place, time, mag, url },
    geometry: { coordinates }
  } = feature;

  const googleMapUrl = `http://maps.google.com/maps?z=2&t=m&q=loc:${coordinates[1]}+${coordinates[0]}`;

  const earthquakeDepthLevel = (depth: number): string => {
    if (depth <= 70) return 'Shallow';
    if (depth > 70 && depth <= 300) return 'Intermediate';
    return 'Deep';
  };

  const popupContent = `
    <h3 style="font-size: 1.1em; font-weight: bold; text-align: center;">${title}</h3>
    <div style="text-align: center;">
      <b>Magnitude</b>: Richter ${mag}M<br> 
    <b>Location</b>: ${place ?? 'N/A'} <br>
    <b>Time (GMT+8/HK)</b>: ${timeConverterToHKT(time)} <br>
    <b>Geo-Coordinates</b>: ${coordinates[1]}, ${coordinates[0]} <br>
    <b>Depth</b>: ${coordinates[2]} km [${earthquakeDepthLevel(
    coordinates[2]
  )}]<br>
    
    <br><br>
    <a target="_blank" href=${googleMapUrl}> VIEW LOCATION ON GOOGLE MAP</a> <br>
    <b>Details</b>: <a href=${url} target="_blank">USGS Detail HERE</a>
    </div>
  `;

  layer.bindPopup(popupContent);
};

let geojson: GeoJSON;

export default function Earthquakes() {
  const startTime = useStore((state) => state.startTime);
  const setData = useStore((state) => state.setData);

  const { data: earthquakes, isLoading } = useQuery(
    ['earthquakes', startTime, ''],
    () => getEarthquakes(startTime, setData)
  );

  const map = useMap();
  useEffect(() => {
    if (!earthquakes) return;

    if (map && geojson && map.hasLayer(geojson)) map.removeLayer(geojson);

    geojson = L.geoJSON((earthquakes as any).features, {
      onEachFeature,
      pointToLayer: (feature: FeatureProps, latlng: LatLng) => {
        return L.circleMarker(latlng, createMarker(feature.properties.mag));
      }
    });

    if (map) geojson.addTo(map);
  }, [earthquakes, map]);

  if (isLoading)
    return (
      <div
        style={{
          position: 'absolute',
          left: '45%',
          marginTop: '20%',
          zIndex: '30',
          backgroundColor: 'grey',
          fontSize: '32px'
        }}>
        ...LOADING...
      </div>
    );

  return null;
}
