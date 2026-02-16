import { motion } from 'framer-motion';
import { useStore } from '../../store';
import { getLineColor } from '../../constants/lines';

export function LineToggles() {
  const currentResult = useStore((s) => s.currentResult);
  const theme = useStore((s) => s.theme);
  const toggleLineVisibility = useStore((s) => s.toggleLineVisibility);
  const focusedLineId = useStore((s) => s.focusedLineId);
  const setFocusedLine = useStore((s) => s.setFocusedLine);

  if (!currentResult) return null;

  const linesWithData = currentResult.lines.filter((l) => l.stations.length > 0);

  return (
    <div className="px-4 py-3">
      <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">
        Lines
      </p>
      <div className="space-y-1">
        {linesWithData.map((line) => {
          const color = getLineColor(line.id, theme);
          const stationCount = line.stations.length;
          const isFocused = focusedLineId === line.id;

          return (
            <div key={line.id} className="flex items-center gap-1.5">
              {/* Visibility toggle */}
              <button
                onClick={() => toggleLineVisibility(line.id )}
                className="flex items-center gap-2 flex-1 px-2 py-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer text-left group"
                title={line.visible ? `Hide ${line.name}` : `Show ${line.name}`}
              >
                {/* Toggle indicator */}
                <motion.div
                  className="w-3.5 h-3.5 rounded flex-shrink-0 border-2"
                  style={{
                    borderColor: color,
                    backgroundColor: line.visible ? color : 'transparent',
                  }}
                  animate={{ opacity: line.visible ? 1 : 0.4 }}
                />
                <span
                  className="text-[13px] flex-1"
                  style={{ color: line.visible ? 'var(--text-primary)' : 'var(--text-muted)', textDecoration: line.visible ? 'none' : 'line-through' }}
                >
                  {line.name}
                </span>
                <span className="text-[11px] text-[var(--text-muted)] tabular-nums">{stationCount}</span>
              </button>

              {/* Focus toggle */}
              {line.visible && (
                <button
                  onClick={() => setFocusedLine(line.id )}
                  className={`
                    px-2 py-1 rounded-md text-[10px] font-medium cursor-pointer transition-all
                    ${isFocused
                      ? 'text-white shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] bg-[var(--bg-tertiary)] hover:bg-[var(--border)]'
                    }
                  `}
                  style={isFocused ? { backgroundColor: color } : undefined}
                  title={isFocused ? 'Unfocus line' : 'Focus this line'}
                >
                  {isFocused ? 'Focused' : 'Focus'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
