import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import { CircleMarker, Popup, useMap } from 'react-leaflet';
import {
  extractRegion,
  formatHKT,
  getDepthCategory,
  getDepthKm,
  getMagnitude,
  getMagnitudeColor,
  getMagnitudeRadius
} from '../../lib/earthquake';
import { EarthquakeFeature } from '../../types/earthquake';

interface EarthquakesProps {
  events: EarthquakeFeature[];
  selectedEarthquakeId: string | null;
  onSelectEarthquake: (feature: EarthquakeFeature) => void;
}

export default function Earthquakes({
  events,
  selectedEarthquakeId,
  onSelectEarthquake
}: EarthquakesProps) {
  const map = useMap();
  const markerRefs = useRef<Record<string, L.CircleMarker>>({});

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEarthquakeId) ?? null,
    [events, selectedEarthquakeId]
  );

  useEffect(() => {
    if (!selectedEvent) return;

    const [longitude, latitude] = selectedEvent.geometry.coordinates;
    map.flyTo([latitude, longitude], Math.max(map.getZoom(), 5), {
      duration: 0.6
    });

    const marker = markerRefs.current[selectedEvent.id];
    if (marker) marker.openPopup();
  }, [map, selectedEvent]);

  return (
    <>
      {events.map((feature) => {
        const [longitude, latitude] = feature.geometry.coordinates;
        const depth = getDepthKm(feature);
        const magnitude = getMagnitude(feature);
        const region = extractRegion(feature.properties.place);
        const isSelected = feature.id === selectedEarthquakeId;

        return (
          <CircleMarker
            key={feature.id}
            center={[latitude, longitude]}
            radius={getMagnitudeRadius(magnitude)}
            pathOptions={{
              fillColor: getMagnitudeColor(magnitude),
              color: isSelected ? '#0f172a' : '#334155',
              weight: isSelected ? 2 : 1,
              opacity: 1,
              fillOpacity: 0.85
            }}
            ref={(node) => {
              if (node) markerRefs.current[feature.id] = node;
            }}
            eventHandlers={{
              click: () => onSelectEarthquake(feature)
            }}>
            <Popup minWidth={260}>
              <div className="space-y-1 text-sm">
                <p className="text-base font-semibold">
                  {feature.properties.title}
                </p>
                <p>
                  <strong>Region:</strong> {region}
                </p>
                <p>
                  <strong>Magnitude:</strong> {magnitude.toFixed(1)} (
                  {feature.properties.magType})
                </p>
                <p>
                  <strong>Depth:</strong> {depth.toFixed(1)} km (
                  {getDepthCategory(depth)})
                </p>
                <p>
                  <strong>Time (HKT):</strong>{' '}
                  {formatHKT(feature.properties.time)}
                </p>
                <p>
                  <strong>Tsunami Flag:</strong>{' '}
                  {feature.properties.tsunami === 1 ? 'Potential' : 'No'}
                </p>
                <p>
                  <strong>Significance:</strong> {feature.properties.sig}
                </p>
                <a
                  className="font-medium text-cyan-700 underline"
                  href={feature.properties.url}
                  target="_blank"
                  rel="noreferrer">
                  Open USGS Event Page
                </a>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}
