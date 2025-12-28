import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

export default function MapController() {
  const map = useMap();

  useEffect(() => {
    // Store map reference globally so it can be accessed by other components
    (window as any).leafletMap = map;

    return () => {
      // Cleanup on unmount
      (window as any).leafletMap = null;
    };
  }, [map]);

  return null;
}
