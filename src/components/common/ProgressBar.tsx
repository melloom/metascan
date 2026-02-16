import { motion } from 'framer-motion';

interface Props {
  value: number;
  color?: string;
  height?: number;
  className?: string;
}

export function ProgressBar({ value, color = 'var(--accent)', height = 4, className = '' }: Props) {
  const clamped = Math.max(0, Math.min(100, value * 100));

  return (
    <div
      className={`w-full rounded-full overflow-hidden bg-[var(--bg-tertiary)] ${className}`}
      style={{ height }}
    >
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={false}
        animate={{ width: `${clamped}%` }}
        transition={{ type: 'spring', stiffness: 140, damping: 18, mass: 0.6 }}
      />
    </div>
  );
}
