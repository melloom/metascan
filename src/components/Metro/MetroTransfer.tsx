import { motion } from 'framer-motion';
import { transferVariants } from '../../animations';
import { TRANSFER_RADIUS } from '../../constants/layout';
import type { Transfer } from '../../types';

interface Props {
  transfer: Transfer & { x: number; y: number };
  animate: boolean;
}

export function MetroTransfer({ transfer, animate }: Props) {
  if (transfer.x === 0 && transfer.y === 0) return null;

  return (
    <motion.g
      variants={animate ? transferVariants : undefined}
      initial={animate ? 'hidden' : undefined}
      animate="visible"
    >
      <circle
        cx={transfer.x}
        cy={transfer.y}
        r={TRANSFER_RADIUS}
        fill="var(--bg-primary)"
        stroke="var(--text-secondary)"
        strokeWidth={2}
      />
      <circle
        cx={transfer.x}
        cy={transfer.y}
        r={TRANSFER_RADIUS - 3}
        fill="none"
        stroke="var(--text-secondary)"
        strokeWidth={1}
      />
    </motion.g>
  );
}
