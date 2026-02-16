import type { Station } from '../types';

const SOURCE_WEIGHTS: Record<string, number> = {
  'JSON-LD': 0.95,
  'Schema.org': 0.9,
  'Meta': 0.8,
  'HTML': 0.7,
  'Script analysis': 0.75,
  'Regex': 0.5,
};

export function scoreConfidence(station: Station): number {
  if (station.evidence.length === 0) return 0.3;

  let maxWeight = 0;
  for (const ev of station.evidence) {
    const w = SOURCE_WEIGHTS[ev.source] ?? 0.5;
    if (w > maxWeight) maxWeight = w;
  }

  // Bonus for multiple evidence sources
  const multiBonus = Math.min(0.1, (station.evidence.length - 1) * 0.05);

  // Bonus for longer values (less likely to be noise)
  const lengthBonus = station.value.length > 10 ? 0.05 : 0;

  return Math.min(1, maxWeight + multiBonus + lengthBonus);
}

export function applyConfidenceScores(stations: Station[]): Station[] {
  return stations.map((s) => ({
    ...s,
    confidence: scoreConfidence(s),
  }));
}
