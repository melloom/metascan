import type { Station, LayoutPoint } from '../types';

interface PlacedStation extends Station {
  x: number;
  y: number;
  labelSide: 'above' | 'below';
}

function dist(a: LayoutPoint, b: LayoutPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function pointAlongPolyline(polyline: LayoutPoint[], targetDist: number): LayoutPoint {
  let accumulated = 0;

  for (let i = 1; i < polyline.length; i++) {
    const segLen = dist(polyline[i - 1], polyline[i]);
    if (accumulated + segLen >= targetDist) {
      const remaining = targetDist - accumulated;
      const frac = segLen > 0 ? remaining / segLen : 0;
      return {
        x: polyline[i - 1].x + (polyline[i].x - polyline[i - 1].x) * frac,
        y: polyline[i - 1].y + (polyline[i].y - polyline[i - 1].y) * frac,
      };
    }
    accumulated += segLen;
  }

  const last = polyline[polyline.length - 1];
  return { x: last.x, y: last.y };
}

export function placeStations(
  stations: Station[],
  polyline: LayoutPoint[],
  totalLength: number,
): PlacedStation[] {
  if (stations.length === 0) return [];

  const padding = 0.06;
  const usableRange = 1 - 2 * padding;

  return stations.map((station, i) => {
    const t = stations.length === 1
      ? 0.5
      : padding + (i / (stations.length - 1)) * usableRange;

    const { x, y } = pointAlongPolyline(polyline, t * totalLength);

    return {
      ...station,
      x,
      y,
      labelSide: (i % 2 === 0 ? 'above' : 'below') as 'above' | 'below',
    };
  });
}
