import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  tooltip?: string;
  active?: boolean;
  size?: 'sm' | 'md';
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}

export function IconButton({ children, tooltip, active, size = 'md', className = '', onClick, disabled }: Props) {
  const sizeClass = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm';

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      title={tooltip}
      onClick={onClick}
      disabled={disabled}
      className={`
        ${sizeClass} rounded-lg flex items-center justify-center
        transition-colors cursor-pointer
        ${active
          ? 'bg-[var(--accent)] text-white'
          : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border)]'
        }
        ${className}
      `}
    >
      {children}
    </motion.button>
  );
}
