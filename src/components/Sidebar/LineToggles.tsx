import { motion } from 'framer-motion';
import { useStore } from '../../store';
import { getLineColor } from '../../constants/lines';
import type { LineId } from '../../types';

export function LineToggles() {
  const currentResult = useStore((s) => s.currentResult);
  const theme = useStore((s) => s.theme);
  const toggleLineVisibility = useStore((s) => s.toggleLineVisibility);
  const focusedLineId = useStore((s) => s.focusedLineId);
  const setFocusedLine = useStore((s) => s.setFocusedLine);

  if (!currentResult) return null;

  return (
    <div className="px-4 py-2">
      <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">
        Lines
      </p>
      <div className="space-y-1">
        {currentResult.lines.map((line) => {
          const color = getLineColor(line.id, theme);
          const stationCount = line.stations.length;
          const isFocused = focusedLineId === line.id;

          return (
            <div key={line.id} className="flex items-center gap-2">
              <button
                onClick={() => toggleLineVisibility(line.id as LineId)}
                className="flex items-center gap-2 flex-1 px-2 py-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer text-left"
              >
                <motion.div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                  animate={{ opacity: line.visible ? 1 : 0.3 }}
                />
                <span
                  className="text-sm flex-1"
                  style={{ color: line.visible ? 'var(--text-primary)' : 'var(--text-muted)' }}
                >
                  {line.name}
                </span>
                <span className="text-[11px] text-[var(--text-muted)]">{stationCount}</span>
              </button>
              <button
                onClick={() => setFocusedLine(line.id as LineId)}
                className={`
                  px-1.5 py-0.5 rounded text-[10px] font-medium cursor-pointer transition-colors
                  ${isFocused
                    ? 'text-white'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }
                `}
                style={isFocused ? { backgroundColor: color } : undefined}
                title={isFocused ? 'Unfocus line' : 'Focus line'}
              >
                {isFocused ? 'ON' : 'focus'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
