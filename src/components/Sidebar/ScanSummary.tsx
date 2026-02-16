import { useStore } from '../../store';
import { useScanAnimation } from '../../hooks';

export function ScanSummary() {
  const currentResult = useStore((s) => s.currentResult);
  const animationPhase = useStore((s) => s.animationPhase);
  const { skipAnimation } = useScanAnimation();

  if (!currentResult) return null;

  const totalStations = currentResult.lines.reduce((sum, l) => sum + l.stations.length, 0);
  const totalConnections = currentResult.transfers.length;
  const activeLines = currentResult.lines.filter((l) => l.stations.length > 0).length;

  // Compute average confidence
  const allStations = currentResult.lines.flatMap((l) => l.stations);
  const avgConfidence = allStations.length > 0
    ? Math.round((allStations.reduce((sum, s) => sum + s.confidence, 0) / allStations.length) * 100)
    : 0;

  // Get domain from URL
  let domain = currentResult.url;
  try {
    domain = new URL(currentResult.url).hostname;
  } catch { /* keep original */ }

  return (
    <div className="px-4 py-3">
      <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">
        Scan Results
      </p>

      {/* Title and domain */}
      <div className="mb-3">
        <p className="text-[13px] font-semibold text-[var(--text-primary)] leading-snug truncate">
          {currentResult.title || domain}
        </p>
        <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">{domain}</p>
      </div>

      {/* Skip animation button */}
      {animationPhase !== 'done' && animationPhase !== 'idle' && (
        <button
          onClick={skipAnimation}
          className="w-full mb-3 px-3 py-2 rounded-lg text-xs font-medium bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors"
        >
          Skip Animation
        </button>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Data Points" value={totalStations} />
        <StatCard label="Connections" value={totalConnections} />
        <StatCard label="Active Lines" value={activeLines} />
        <StatCard label="Avg Confidence" value={`${avgConfidence}%`} />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="px-2.5 py-2 rounded-lg bg-[var(--bg-tertiary)]">
      <p className="text-base font-bold text-[var(--text-primary)] tabular-nums">{value}</p>
      <p className="text-[10px] text-[var(--text-muted)]">{label}</p>
    </div>
  );
}
