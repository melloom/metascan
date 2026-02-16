import type { Station, LayoutSegment } from '../types';

interface PlacedStation extends Station {
  x: number;
  y: number;
  labelSide: 'above' | 'below';
}

function segmentLength(seg: LayoutSegment): number {
  const dx = seg.to.x - seg.from.x;
  const dy = seg.to.y - seg.from.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function pointAlongSegments(segments: LayoutSegment[], t: number, totalLength: number): { x: number; y: number } {
  const targetDist = t * totalLength;
  let accumulated = 0;

  for (const seg of segments) {
    const len = segmentLength(seg);
    if (accumulated + len >= targetDist) {
      const remaining = targetDist - accumulated;
      const frac = len > 0 ? remaining / len : 0;
      return {
        x: seg.from.x + (seg.to.x - seg.from.x) * frac,
        y: seg.from.y + (seg.to.y - seg.from.y) * frac,
      };
    }
    accumulated += len;
  }

  const last = segments[segments.length - 1];
  return { x: last.to.x, y: last.to.y };
}

export function placeStations(
  stations: Station[],
  segments: LayoutSegment[],
  totalLength: number,
): PlacedStation[] {
  if (stations.length === 0) return [];

  const padding = 0.05;
  const usableRange = 1 - 2 * padding;

  return stations.map((station, i) => {
    const t = stations.length === 1
      ? 0.5
      : padding + (i / (stations.length - 1)) * usableRange;

    const { x, y } = pointAlongSegments(segments, t, totalLength);

    return {
      ...station,
      x,
      y,
      labelSide: (i % 2 === 0 ? 'above' : 'below') as 'above' | 'below',
    };
  });
}
