import { useMemo } from 'react';
import { useStore } from '../store';
import type { Station } from '../types';

export function useStationSearch() {
  const currentResult = useStore((s) => s.currentResult);
  const searchQuery = useStore((s) => s.searchQuery);

  const allStations = useMemo(() => {
    if (!currentResult) return [];
    return currentResult.lines.flatMap((l) => l.stations);
  }, [currentResult]);

  const matchedStations = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return allStations.filter(
      (s) => s.label.toLowerCase().includes(q) || s.value.toLowerCase().includes(q)
    );
  }, [allStations, searchQuery]);

  const isStationHighlighted = useMemo(() => {
    if (!searchQuery.trim()) return () => false;
    const ids = new Set(matchedStations.map((s) => s.id));
    return (s: Station) => ids.has(s.id);
  }, [matchedStations, searchQuery]);

  return { allStations, matchedStations, isStationHighlighted };
}
