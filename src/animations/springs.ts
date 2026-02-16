export const springPresets = {
  snappy: { type: 'spring' as const, stiffness: 400, damping: 30 },
  bouncy: { type: 'spring' as const, stiffness: 300, damping: 15, mass: 0.8 },
  gentle: { type: 'spring' as const, stiffness: 150, damping: 20 },
  slow: { type: 'spring' as const, stiffness: 100, damping: 25, mass: 1.2 },
};
