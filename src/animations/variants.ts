import type { Variants } from 'framer-motion';

export const lineDrawVariants: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (i: number) => ({
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { duration: 1.2, delay: i * 0.35, ease: [0.4, 0, 0.2, 1] }, // Demo-quality timing and easing
      opacity: { duration: 0.3, delay: i * 0.35, ease: 'easeOut' },
    },
  }),
};

export const stationPopVariants: Variants = {
  hidden: { scale: 0, opacity: 0 },
  visible: (i: number) => ({
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 600, // Balanced for smooth but responsive
      damping: 25, // Good damping for smooth animation
      mass: 0.8,
      delay: i * 0.02, // Consistent with demo timing
    },
  }),
};

export const stationLabelVariants: Variants = {
  hidden: { opacity: 0, y: 3, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.02 + 0.04, // Consistent with demo timing
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1], // Same smooth easing as lines
    },
  }),
};

export const transferVariants: Variants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 20,
      delay: 0.2,
    },
  },
};

export const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.4 },
  },
};

export const slideInLeftVariants: Variants = {
  hidden: { x: -20, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 300, damping: 25 },
  },
};

export const slideInRightVariants: Variants = {
  hidden: { x: 20, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 300, damping: 25 },
  },
};

export const slideUpVariants: Variants = {
  hidden: { y: 50, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 300, damping: 25 },
  },
};

export const lineFocusVariants: Variants = {
  normal: { opacity: 1, filter: 'brightness(1)' },
  dimmed: { opacity: 0.15, filter: 'brightness(0.6)', transition: { duration: 0.3 } },
  focused: { opacity: 1, filter: 'brightness(1.15)', transition: { duration: 0.3 } },
};
