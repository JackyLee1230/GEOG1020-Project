import { useState } from 'react';
import { Marker, Popup, Tooltip, useMapEvents } from 'react-leaflet';
import { LatLng, Icon } from 'leaflet';
import markerIconPng from 'leaflet/dist/images/marker-icon.png';

export default function LocationMarker() {
  const [position, setPosition] = useState<LatLng | null>(null);

  const map = useMapEvents({
    keypress(e) {
      if (e && e.originalEvent.key === ' ') {
        map.locate();
      }
    },
    click(e) {
      map.setView(e.latlng, map.getZoom(), {
        animate: true
      });
    },
    locationfound(e) {
      setPosition(e.latlng);
      map.flyTo(e.latlng, 12, { duration: 1 });
    }
  });

  return position === null ? null : (
    <Marker
      position={position}
      icon={
        new Icon({
          iconUrl: markerIconPng,
          iconSize: [25, 41],
          iconAnchor: [12, 41]
        })
      }>
      <Popup>You are here</Popup>
      <Tooltip>You are here</Tooltip>
    </Marker>
  );
}
