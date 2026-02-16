import type { LineId, LayoutPoint, LayoutSegment } from '../types';
import { LINE_ROUTES, CORNER_RADIUS, type Direction } from '../constants/layout';

const DIRECTION_VECTORS: Record<Direction, { dx: number; dy: number }> = {
  'right': { dx: 1, dy: 0 },
  'down-right': { dx: 0.707, dy: 0.707 },
  'down': { dx: 0, dy: 1 },
  'down-left': { dx: -0.707, dy: 0.707 },
  'left': { dx: -1, dy: 0 },
  'up-left': { dx: -0.707, dy: -0.707 },
  'up': { dx: 0, dy: -1 },
  'up-right': { dx: 0.707, dy: -0.707 },
};

export interface RouteResult {
  segments: LayoutSegment[];
  path: string;
  totalLength: number;
}

function segmentLength(seg: LayoutSegment): number {
  const dx = seg.to.x - seg.from.x;
  const dy = seg.to.y - seg.from.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function routeLine(lineId: LineId, stationCount: number): RouteResult {
  const route = LINE_ROUTES[lineId];
  const baseSegments = route.segments;

  // Scale segment lengths to fit station count
  const minLength = Math.max(1, stationCount) * 50;
  const baseTotal = baseSegments.reduce((sum, s) => sum + s.length, 0);
  const scale = Math.max(1, minLength / baseTotal);

  // Build points along the route
  const points: LayoutPoint[] = [{ ...route.start }];
  let current = { ...route.start };

  for (const seg of baseSegments) {
    const vec = DIRECTION_VECTORS[seg.direction];
    const len = seg.length * scale;
    current = {
      x: current.x + vec.dx * len,
      y: current.y + vec.dy * len,
    };
    points.push({ ...current });
  }

  // Build segments
  const segments: LayoutSegment[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    segments.push({ from: points[i], to: points[i + 1] });
  }

  // Build SVG path with rounded corners
  const r = CORNER_RADIUS;
  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    // Direction from prev to curr
    const d1x = curr.x - prev.x;
    const d1y = curr.y - prev.y;
    const len1 = Math.sqrt(d1x * d1x + d1y * d1y);

    // Direction from curr to next
    const d2x = next.x - curr.x;
    const d2y = next.y - curr.y;
    const len2 = Math.sqrt(d2x * d2x + d2y * d2y);

    const useR = Math.min(r, len1 / 2, len2 / 2);

    // Point before corner
    const bx = curr.x - (d1x / len1) * useR;
    const by = curr.y - (d1y / len1) * useR;

    // Point after corner
    const ax = curr.x + (d2x / len2) * useR;
    const ay = curr.y + (d2y / len2) * useR;

    path += ` L ${bx} ${by} Q ${curr.x} ${curr.y} ${ax} ${ay}`;
  }

  path += ` L ${points[points.length - 1].x} ${points[points.length - 1].y}`;

  const totalLength = segments.reduce((sum, s) => sum + segmentLength(s), 0);

  return { segments, path, totalLength };
}
