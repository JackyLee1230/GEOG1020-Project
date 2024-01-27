/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect } from 'react';
import { Control, DomUtil } from 'leaflet';
import { useMap } from 'react-leaflet';
import './Legend.css';

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

export default function Legend() {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const legend = new Control({ position: 'bottomright' });

    legend.onAdd = () => {
      const div = DomUtil.create('div', 'info legend');
      const grades = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      const labels = [];

      labels.push(
        '<h4 style=" text-align: center; padding-bottom: 0;">Magnitude</h4>'
      );
      labels.push('<h4 style=" text-align: center">In Richter Scale [M]</h4>');

      grades.forEach((from, index) => {
        const to = grades[index + 1];
        labels.push(
          `<i style="background:${markerColorByMagnitude(
            from + 1
          )}"></i>${from}${to ? `&ndash;${to}` : '+'}`
        );
      });

      div.innerHTML = labels.join('<br>');
      return div;
    };

    legend.addTo(map);
  }, [map]);

  return null;
}
