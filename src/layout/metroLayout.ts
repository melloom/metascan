import type { ScanResult, LayoutResult, LayoutLine } from '../types';
import { routeLine } from './lineRouter';
import { placeStations } from './stationPlacer';
import { placeTransfers } from './transferClusterer';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants/layout';

export function computeLayout(scanResult: ScanResult): LayoutResult {
  const layoutLines: LayoutLine[] = [];

  for (const line of scanResult.lines) {
    const route = routeLine(line.id, line.stations.length);
    const placedStations = placeStations(line.stations, route.segments, route.totalLength);

    layoutLines.push({
      lineId: line.id,
      path: route.path,
      segments: route.segments,
      stations: placedStations,
    });
  }

  const placedTransfers = placeTransfers(scanResult.transfers, layoutLines);

  return {
    lines: layoutLines,
    transfers: placedTransfers,
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
  };
}
