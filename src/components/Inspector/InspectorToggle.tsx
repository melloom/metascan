import { useStore } from '../../store';

export function InspectorToggle() {
  const currentResult = useStore((s) => s.currentResult);
  const selectedStationId = useStore((s) => s.selectedStationId);
  const inspectorOpen = useStore((s) => s.inspectorOpen);
  const setInspectorOpen = useStore((s) => s.setInspectorOpen);
  const selectStation = useStore((s) => s.selectStation);

  // Only show toggle if there's a scan result and a station was previously selected
  const hasSelection = currentResult && selectedStationId;

  if (!hasSelection) return null;

  return (
    <button
      onClick={() => {
        if (inspectorOpen) {
          // Close inspector by clearing selection
          selectStation(null);
        } else {
          // Reopen inspector by restoring the open state
          setInspectorOpen(true);
        }
      }}
      className={`
        fixed top-3 right-3 z-40 md:flex
        w-10 h-10 rounded-xl flex items-center justify-center
        bg-[var(--bg-secondary)] border border-[var(--border)]
        text-[var(--text-primary)] cursor-pointer
        transition-all duration-300
        ${inspectorOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}
      `}
      title={inspectorOpen ? 'Close inspector' : 'Open inspector'}
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    </button>
  );
}
