import {
  MapContainer,
  TileLayer,
  LayersControl,
  GeoJSON,
  ScaleControl
} from 'react-leaflet';
import { useEffect } from 'react';
import styled from 'styled-components';
import Earthquakes from './Earthquakes';
import Legend from './Legend';
import tectonicPlates from '../../PB2002_boundaries.json';
import LocationMarker from './LocationMarker';
import LatestEarthquakes from '../LatestEarthquakes';
import MapController from './MapController';

const mapHeight = { height: 'calc(100vh - 64px)', marginTop: '64px' };

const MapWrapper = styled.div`
  width: 100%;
  height: 100vh;
  position: fixed;

  @media only screen and (max-width: 768px) {
    height: 100vh;
  }
`;

const tileLayers = [
  {
    id: 1,
    name: 'Map Nik',
    attribution:
      '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    checked: false
  },
  {
    id: 2,
    name: 'Google Street Map',
    attribution: '&copy; Google',
    url: 'http://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=en',
    checked: true
  },
  {
    id: 3,
    name: 'Google Satellite Map',
    attribution: '&copy; Google',
    url: 'http://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}&hl=en',
    checked: false
  },
  {
    id: 4,
    name: 'Google Terrain Map',
    attribution: '&copy; Google',
    url: 'http://mt1.google.com/vt/lyrs=t&x={x}&y={y}&z={z}&hl=en',
    checked: false
  },
  {
    id: 5,
    name: 'Open Street Map',
    attribution:
      '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    checked: false
  }
];

const tectonicPlatesStyle = {
  color: 'darkorange',
  weight: 2
};

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

const geojsonMarkerOptions = (magnitude: number): Object => ({
  radius: 2.4 * magnitude,
  fillColor: markerColorByMagnitude(magnitude),
  color: 'grey',
  weight: 0.5,
  opacity: 1,
  fillOpacity: 0.8
});

export { markerColorByMagnitude, geojsonMarkerOptions };

export default function Map() {
  useEffect(() => {
    const attribution = document.querySelector('.leaflet-control-attribution');
    // document.getElementsByClassName( 'leaflet-control-attribution' )[0].style.display = 'none'
    if (attribution) {
      attribution.remove();
    }
  }, []);

  return (
    <MapWrapper>
      <MapContainer center={[0, 0]} zoom={3} style={mapHeight}>
        <MapController />
        <LayersControl position="topright">
          {tileLayers.map(({ id, name, attribution, url, checked }) => (
            <LayersControl.BaseLayer key={id} name={name} checked={checked}>
              <TileLayer attribution={attribution} url={url} />
            </LayersControl.BaseLayer>
          ))}
          <LayersControl.Overlay checked name="Tectonic Plates">
            <GeoJSON
              data={tectonicPlates as GeoJSON.GeoJsonObject}
              style={tectonicPlatesStyle}
            />
          </LayersControl.Overlay>
        </LayersControl>
        <LocationMarker />
        <Earthquakes />
        <ScaleControl />
        <Legend />
      </MapContainer>
      <LatestEarthquakes />
    </MapWrapper>
  );
}
