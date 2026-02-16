import type { LayoutPoint, LayoutSegment } from '../types';
import { CORNER_RADIUS, CANVAS_WIDTH, CANVAS_HEIGHT, type Direction, type LineRoute } from '../constants/layout';

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
  polyline: LayoutPoint[];
}

function dist(a: LayoutPoint, b: LayoutPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function sampleQuadratic(
  p0: LayoutPoint,
  p1: LayoutPoint,
  p2: LayoutPoint,
  numSamples: number,
): LayoutPoint[] {
  const points: LayoutPoint[] = [];
  for (let i = 1; i <= numSamples; i++) {
    const t = i / numSamples;
    const mt = 1 - t;
    points.push({
      x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
      y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
    });
  }
  return points;
}

/**
 * Generate a route for a line. Uses predefined routes for core LineIds,
 * and generates dynamic routes for any other lineId based on slot index.
 */
export function routeLine(lineId: string, stationCount: number, lineIndex: number, totalLines: number): RouteResult {
  // Always use dynamic routing to ensure unique routes for each example
  // This prevents the same predefined routes from being used across different business types
  const route = generateDynamicRoute(lineIndex, totalLines, lineId);
  
  return buildRoute(route, stationCount);
}

function generateDynamicRoute(lineIndex: number, totalLines: number, lineId?: string): LineRoute {
  const topMargin = 100;
  const bottomMargin = 60;
  const leftMargin = 80;
  const rightMargin = 80;
  
  const usableHeight = CANVAS_HEIGHT - topMargin - bottomMargin;
  const usableWidth = CANVAS_WIDTH - leftMargin - rightMargin;
  
  // Create unique routing based on lineId hash to ensure different patterns for different business types
  const lineIdHash = lineId ? lineId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0;
  const seed = (lineIdHash + lineIndex) % 100;
  
  // Calculate if we need multiple columns
  const maxLinesPerColumn = 8;
  const needsMultiColumn = totalLines > maxLinesPerColumn;
  
  let columnIndex = 0;
  let indexInColumn = lineIndex;
  
  if (needsMultiColumn) {
    columnIndex = Math.floor(lineIndex / maxLinesPerColumn);
    indexInColumn = lineIndex % maxLinesPerColumn;
  }
  
  const columns = needsMultiColumn ? Math.ceil(totalLines / maxLinesPerColumn) : 1;
  const columnWidth = usableWidth / columns;
  
  // Calculate vertical spacing with minimum and maximum bounds
  const minSpacing = 70;
  const maxSpacing = 120;
  const linesInThisColumn = needsMultiColumn 
    ? Math.min(maxLinesPerColumn, totalLines - columnIndex * maxLinesPerColumn)
    : totalLines;
  
  let spacing = usableHeight / Math.max(1, linesInThisColumn - 1);
  spacing = Math.max(minSpacing, Math.min(maxSpacing, spacing));
  
  // Calculate Y position with better distribution and lineId variation
  const yVariation = (seed % 20) - 10; // -10 to +10 pixels variation
  const y = linesInThisColumn === 1 
    ? CANVAS_HEIGHT / 2 + yVariation  // Center single line in column with variation
    : topMargin + indexInColumn * spacing + yVariation;
  
  // Calculate X position based on column with lineId variation
  const columnOffset = columnIndex * columnWidth;
  const xVariation = (indexInColumn % 3) * 12 + (seed % 15); // More variation per line
  const x = leftMargin + columnOffset + xVariation;
  
  // Enhanced bend patterns with unique variation based on lineId
  const basePatterns: Array<{ dir: Direction; factor: number }> = [
    { dir: 'down-right', factor: 0.18 + (seed % 10) * 0.01 },
    { dir: 'up-right', factor: 0.16 + (seed % 8) * 0.01 },
    { dir: 'down-right', factor: 0.14 + (seed % 12) * 0.01 },
    { dir: 'up-right', factor: 0.12 + (seed % 15) * 0.01 },
    { dir: 'down-right', factor: 0.20 + (seed % 7) * 0.01 },
    { dir: 'up-right', factor: 0.15 + (seed % 9) * 0.01 },
    { dir: 'down-right', factor: 0.13 + (seed % 11) * 0.01 },
    { dir: 'up-right', factor: 0.17 + (seed % 6) * 0.01 },
    { dir: 'right', factor: 0.22 + (seed % 8) * 0.01 }, // Add straight lines
    { dir: 'down', factor: 0.18 + (seed % 6) * 0.01 },
    { dir: 'up', factor: 0.16 + (seed % 7) * 0.01 },
    { dir: 'down-left', factor: 0.14 + (seed % 9) * 0.01 }, // Add diagonal variations
    { dir: 'up-left', factor: 0.12 + (seed % 10) * 0.01 },
  ];
  
  // Add different patterns for different columns to create visual distinction
  const columnPatterns: Array<Array<{ dir: Direction; factor: number }>> = [
    basePatterns, // Column 0: standard patterns
    [
      { dir: 'right', factor: 0.25 + (seed % 5) * 0.01 },      // Column 1: more straight lines
      { dir: 'down', factor: 0.15 + (seed % 4) * 0.01 },
      { dir: 'up', factor: 0.15 + (seed % 6) * 0.01 },
      { dir: 'down-right', factor: 0.18 + (seed % 7) * 0.01 },
      { dir: 'up-right', factor: 0.12 + (seed % 8) * 0.01 },
    ],
    [
      { dir: 'down-left', factor: 0.12 + (seed % 6) * 0.01 },   // Column 2: diagonal patterns
      { dir: 'up-left', factor: 0.12 + (seed % 7) * 0.01 },
      { dir: 'down-right', factor: 0.16 + (seed % 5) * 0.01 },
      { dir: 'up-right', factor: 0.14 + (seed % 9) * 0.01 },
      { dir: 'right', factor: 0.20 + (seed % 4) * 0.01 },
    ],
    [
      { dir: 'down-right', factor: 0.10 + (seed % 8) * 0.01 },   // Column 3: more subtle patterns
      { dir: 'up-right', factor: 0.08 + (seed % 6) * 0.01 },
      { dir: 'right', factor: 0.25 + (seed % 7) * 0.01 },
      { dir: 'down', factor: 0.20 + (seed % 5) * 0.01 },
      { dir: 'up', factor: 0.18 + (seed % 4) * 0.01 },
    ],
  ];
  
  const patternsForColumn = columnPatterns[columnIndex % columnPatterns.length] || basePatterns;
  const bend = patternsForColumn[indexInColumn % patternsForColumn.length];
  
  // Adjust available width based on column
  const availableWidth = columnWidth - xVariation - 20; // Leave space at end
  const totalWidth = Math.min(availableWidth, usableWidth / columns);
  
  const bendLen = totalWidth * bend.factor;
  const straightLen = (totalWidth - bendLen) / 2;
  
  // Ensure minimum segment lengths
  const minSegmentLength = Math.max(80, 300 / linesInThisColumn);
  const adjustedStraightLen = Math.max(minSegmentLength, straightLen);
  const adjustedBendLen = Math.max(minSegmentLength / 2, bendLen);
  
  return {
    start: { x, y },
    segments: [
      { direction: 'right', length: adjustedStraightLen },
      { direction: bend.dir, length: adjustedBendLen },
      { direction: 'right', length: adjustedStraightLen },
    ],
  };
}

function buildRoute(route: LineRoute, stationCount: number): RouteResult {
  const baseSegments = route.segments;

  // Scale segment lengths to fit station count with better minimums and maximums
  // For lines with many stations, ensure adequate spacing
  const stationSpacing = stationCount > 20 
    ? Math.max(25, Math.min(40, 1500 / stationCount)) // Tighter spacing for many stations
    : Math.max(45, Math.min(65, 1200 / Math.max(1, stationCount))); // Normal spacing
  
  const minLength = Math.max(1, stationCount) * stationSpacing;
  const baseTotal = baseSegments.reduce((sum, s) => sum + s.length, 0);
  const scale = Math.max(1, minLength / baseTotal);

  // Build waypoints along the route
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

  // Improved bounds checking with dynamic margins
  const margin = 60;
  const maxX = CANVAS_WIDTH - margin;
  const maxY = CANVAS_HEIGHT - margin;
  
  for (let i = 1; i < points.length; i++) {
    points[i].x = Math.max(margin, Math.min(points[i].x, maxX));
    points[i].y = Math.max(margin, Math.min(points[i].y, maxY));
  }

  // Build segments (straight-line between waypoints)
  const segments: LayoutSegment[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    segments.push({ from: points[i], to: points[i + 1] });
  }

  // Build SVG path with rounded corners AND a matching polyline
  const r = Math.min(CORNER_RADIUS, stationSpacing / 2); // Adaptive corner radius
  let path = `M ${points[0].x} ${points[0].y}`;
  const polyline: LayoutPoint[] = [{ ...points[0] }];

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    const d1x = curr.x - prev.x;
    const d1y = curr.y - prev.y;
    const len1 = Math.sqrt(d1x * d1x + d1y * d1y);

    const d2x = next.x - curr.x;
    const d2y = next.y - curr.y;
    const len2 = Math.sqrt(d2x * d2x + d2y * d2y);

    if (len1 === 0 || len2 === 0) continue;

    const useR = Math.min(r, len1 / 2, len2 / 2);

    const bx = curr.x - (d1x / len1) * useR;
    const by = curr.y - (d1y / len1) * useR;

    const ax = curr.x + (d2x / len2) * useR;
    const ay = curr.y + (d2y / len2) * useR;

    path += ` L ${bx} ${by} Q ${curr.x} ${curr.y} ${ax} ${ay}`;

    polyline.push({ x: bx, y: by });
    const curvePts = sampleQuadratic(
      { x: bx, y: by },
      { x: curr.x, y: curr.y },
      { x: ax, y: ay },
      Math.max(5, Math.floor(useR / 2)), // Adaptive curve sampling
    );
    polyline.push(...curvePts);
  }

  const last = points[points.length - 1];
  path += ` L ${last.x} ${last.y}`;
  polyline.push({ ...last });

  let totalLength = 0;
  for (let i = 1; i < polyline.length; i++) {
    totalLength += dist(polyline[i - 1], polyline[i]);
  }

  return { segments, path, totalLength, polyline };
}
