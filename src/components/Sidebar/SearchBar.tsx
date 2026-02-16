import { useStore } from '../../store';
import { useStationSearch } from '../../hooks';

interface Props {
  onSelectStation: (stationId: string) => void;
}

export function SearchBar({ onSelectStation }: Props) {
  const searchQuery = useStore((s) => s.searchQuery);
  const setSearchQuery = useStore((s) => s.setSearchQuery);
  const currentResult = useStore((s) => s.currentResult);
  const { matchedStations } = useStationSearch();

  if (!currentResult) return null;

  return (
    <div className="px-4 py-2">
      <div className="flex items-center gap-2 mb-2">
        <svg className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <span className="text-[var(--text-muted)] text-xs font-medium uppercase tracking-wide">Search Stations</span>
      </div>
      
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Type to search..."
        className="
          w-full px-3 py-2 rounded-lg text-sm
          bg-[var(--input-bg)] border border-[var(--input-border)]
          text-[var(--text-primary)] placeholder:text-[var(--text-muted)]
          focus:outline-none focus:border-[var(--input-focus)] focus:ring-1 focus:ring-[var(--input-focus)]
          transition-colors
        "
      />

      {searchQuery.trim() && (
        <div className="mt-2 max-h-40 overflow-y-auto space-y-0.5">
          {matchedStations.length === 0 ? (
            <p className="text-[11px] text-[var(--text-muted)] py-1">No matches</p>
          ) : (
            matchedStations.map((s) => (
              <button
                key={s.id}
                onClick={() => onSelectStation(s.id)}
                className="
                  w-full text-left px-2 py-2 rounded text-sm
                  hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer
                  text-[var(--text-primary)]
                  flex flex-col gap-0.5
                "
              >
                <div className="text-[var(--text-muted)] text-[10px] font-medium uppercase tracking-wide">
                  {s.label}
                </div>
                <div className="text-[var(--text-primary)] text-xs">
                  {s.value}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
