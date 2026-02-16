import type { Station, Transfer, Line } from '../types';
import { similarity, normalizeValue } from './normalizer';

export function detectTransfers(lines: Line[]): Transfer[] {
  const transfers: Transfer[] = [];
  const allStations: Station[] = lines.flatMap((l) => l.stations);
  let id = 0;

  for (let i = 0; i < allStations.length; i++) {
    for (let j = i + 1; j < allStations.length; j++) {
      const a = allStations[i];
      const b = allStations[j];

      // Don't connect stations on the same line
      if (a.lineId === b.lineId) continue;

      // Check for value overlap
      const normA = normalizeValue(a.value);
      const normB = normalizeValue(b.value);

      let reason = '';

      // Exact match
      if (normA === normB && normA.length > 3) {
        reason = 'Exact value match';
      }
      // High similarity
      else if (similarity(a.value, b.value) > 0.6) {
        reason = 'Similar values';
      }
      // Label+value containment (e.g., address in contacts & identity)
      else if (normA.length > 5 && normB.includes(normA)) {
        reason = `"${a.value}" found in "${b.value}"`;
      } else if (normB.length > 5 && normA.includes(normB)) {
        reason = `"${b.value}" found in "${a.value}"`;
      }

      if (reason) {
        transfers.push({
          id: `transfer-${++id}`,
          stationIds: [a.id, b.id],
          lineIds: [a.lineId, b.lineId],
          reason,
        });
      }
    }
  }

  return transfers.slice(0, 15);
}
