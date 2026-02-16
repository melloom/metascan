import type { Transfer, LayoutLine } from '../types';

interface PlacedTransfer extends Transfer {
  x: number;
  y: number;
}

export function placeTransfers(
  transfers: Transfer[],
  layoutLines: LayoutLine[],
): PlacedTransfer[] {
  const stationPositions = new Map<string, { x: number; y: number }>();

  for (const line of layoutLines) {
    for (const station of line.stations) {
      stationPositions.set(station.id, { x: station.x, y: station.y });
    }
  }

  return transfers.map((transfer) => {
    const posA = stationPositions.get(transfer.stationIds[0]);
    const posB = stationPositions.get(transfer.stationIds[1]);

    if (!posA || !posB) {
      return { ...transfer, x: 0, y: 0 };
    }

    return {
      ...transfer,
      x: (posA.x + posB.x) / 2,
      y: (posA.y + posB.y) / 2,
    };
  });
}
