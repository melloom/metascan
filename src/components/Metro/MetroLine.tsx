import { motion } from 'framer-motion';
import { lineDrawVariants, lineFocusVariants } from '../../animations';
import { getLineColor } from '../../constants/lines';
import { useStore } from '../../store';
import type { LayoutLine } from '../../types';
import { LINE_WIDTH } from '../../constants/layout';

interface Props {
  layoutLine: LayoutLine;
  lineIndex: number;
  animate: boolean;
}

export function MetroLine({ layoutLine, lineIndex, animate }: Props) {
  const theme = useStore((s) => s.theme);
  const focusedLineId = useStore((s) => s.focusedLineId);
  const currentResult = useStore((s) => s.currentResult);

  const line = currentResult?.lines.find((l) => l.id === layoutLine.lineId);
  if (!line?.visible) return null;

  const color = getLineColor(layoutLine.lineId, theme);
  const focusState = focusedLineId === null
    ? 'normal'
    : focusedLineId === layoutLine.lineId
    ? 'focused'
    : 'dimmed';

  return (
    <motion.g
      variants={lineFocusVariants}
      animate={focusState}
    >
      {/* Glow effect for dark theme */}
      {theme === 'dark' && (
        <motion.path
          d={layoutLine.path}
          fill="none"
          stroke={color}
          strokeWidth={LINE_WIDTH + 8}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.15}
          style={{ filter: 'blur(8px)' }}
          variants={animate ? lineDrawVariants : undefined}
          initial={animate ? 'hidden' : undefined}
          animate="visible"
          custom={lineIndex}
        />
      )}

      {/* Main line */}
      <motion.path
        d={layoutLine.path}
        fill="none"
        stroke={color}
        strokeWidth={LINE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
        variants={animate ? lineDrawVariants : undefined}
        initial={animate ? 'hidden' : undefined}
        animate="visible"
        custom={lineIndex}
      />
    </motion.g>
  );
}
