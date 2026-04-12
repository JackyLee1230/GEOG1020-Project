import { useEffect } from 'react';
import { Control, DomUtil } from 'leaflet';
import { useMap } from 'react-leaflet';
import './Legend.css';

const markerColorByMagnitude = (magnitude: number): string => {
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

export default function Legend() {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const legend = new Control({ position: 'bottomright' });

    legend.onAdd = () => {
      const div = DomUtil.create('div', 'eq-legend');
      const grades = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      const labels = [];

      labels.push('<h4>Magnitude (Richter)</h4>');

      grades.forEach((from, index) => {
        const to = grades[index + 1];
        labels.push(
          `<i style="background:${markerColorByMagnitude(from)}"></i>${from}${
            to ? `&ndash;${to}` : '+'
          }`
        );
      });

      div.innerHTML = labels.join('<br>');
      return div;
    };

    legend.addTo(map);
  }, [map]);

  return null;
}
