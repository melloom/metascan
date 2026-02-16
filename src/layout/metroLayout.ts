import type { ScanResult, LayoutResult, LayoutLine } from '../types';
import { routeLine } from './lineRouter';
import { placeStations } from './stationPlacer';
import { placeTransfers } from './transferClusterer';
import { detectTransfers } from '../engine/transferDetector';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants/layout';

export function computeLayout(scanResult: ScanResult): LayoutResult {
  const layoutLines: LayoutLine[] = [];
  const totalLines = scanResult.lines.length;

  for (let lineIndex = 0; lineIndex < scanResult.lines.length; lineIndex++) {
    const line = scanResult.lines[lineIndex];
    const route = routeLine(line.id, line.stations.length, lineIndex, totalLines);
    const placedStations = placeStations(line.stations, route.polyline, route.totalLength);

    layoutLines.push({
      lineId: line.id,
      path: route.path,
      segments: route.segments,
      stations: placedStations,
    });
  }

  // Use new transfer detection that considers line intersections
  const transfers = detectTransfers(layoutLines);
  const placedTransfers = placeTransfers(transfers, layoutLines);

  return {
    lines: layoutLines,
    transfers: placedTransfers,
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
  };
}
