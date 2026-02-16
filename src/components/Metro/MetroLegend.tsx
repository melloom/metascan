import { motion } from 'framer-motion';
import { fadeInVariants } from '../../animations';
import { useStore } from '../../store';
import { getLineColor } from '../../constants/lines';

export function MetroLegend() {
  const currentResult = useStore((s) => s.currentResult);
  const theme = useStore((s) => s.theme);
  const animationPhase = useStore((s) => s.animationPhase);

  if (!currentResult) return null;

  const visibleLines = currentResult.lines.filter((l) => l.visible && l.stations.length > 0);

  return (
    <motion.div
      className="absolute bottom-4 left-4 flex flex-wrap gap-3 px-3 py-2 rounded-xl bg-[var(--bg-surface)]/80 backdrop-blur-sm border border-[var(--border)]"
      variants={fadeInVariants}
      initial="hidden"
      animate={animationPhase === 'done' || animationPhase === 'idle' ? 'visible' : 'hidden'}
    >
      {visibleLines.map((line) => (
        <div key={line.id} className="flex items-center gap-1.5">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: getLineColor(line.id, theme) }}
          />
          <span className="text-[11px] text-[var(--text-secondary)]">
            {line.name} ({line.stations.length})
          </span>
        </div>
      ))}
    </motion.div>
  );
}
