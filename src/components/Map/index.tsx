import {
  GeoJSON,
  LayersControl,
  MapContainer,
  ScaleControl,
  TileLayer
} from 'react-leaflet';
import type { GeoJsonObject } from 'geojson';
import tectonicPlates from '../../PB2002_boundaries.json';
import { EarthquakeFeature } from '../../types/earthquake';
import Earthquakes from './Earthquakes';
import Legend from './Legend';
import LocationMarker from './LocationMarker';

interface MapProps {
  events: EarthquakeFeature[];
  selectedEarthquakeId: string | null;
  showLegend: boolean;
  onSelectEarthquake: (feature: EarthquakeFeature) => void;
}

const tileLayers = [
  {
    id: 1,
    name: 'Carto Light',
    attribution:
      '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    checked: true
  },
  {
    id: 2,
    name: 'OpenStreetMap',
    attribution:
      '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    checked: false
  },
  {
    id: 3,
    name: 'Google Terrain',
    attribution: '&copy; Google',
    url: 'https://mt1.google.com/vt/lyrs=t&x={x}&y={y}&z={z}&hl=en',
    checked: false
  },
  {
    id: 4,
    name: 'Google Satellite',
    attribution: '&copy; Google',
    url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}&hl=en',
    checked: false
  }
];

const tectonicPlatesStyle = {
  color: '#f97316',
  weight: 1.8,
  opacity: 0.9
};

export default function Map({
  events,
  selectedEarthquakeId,
  showLegend,
  onSelectEarthquake
}: MapProps) {
  return (
    <div className="h-[60vh] min-h-[440px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg md:h-[68vh] lg:h-full">
      <MapContainer
        center={[0, 0]}
        zoom={2.4}
        className="h-full w-full"
        scrollWheelZoom
        minZoom={2}>
        <LayersControl position="topright">
          {tileLayers.map(({ id, name, attribution, url, checked }) => (
            <LayersControl.BaseLayer key={id} name={name} checked={checked}>
              <TileLayer attribution={attribution} url={url} />
            </LayersControl.BaseLayer>
          ))}

          <LayersControl.Overlay checked name="Tectonic Plates">
            <GeoJSON
              data={tectonicPlates as GeoJsonObject}
              style={tectonicPlatesStyle}
            />
          </LayersControl.Overlay>
        </LayersControl>

        <Earthquakes
          events={events}
          selectedEarthquakeId={selectedEarthquakeId}
          onSelectEarthquake={onSelectEarthquake}
        />
        <LocationMarker />
        <ScaleControl />
        {showLegend ? <Legend /> : null}
      </MapContainer>
    </div>
  );
}
