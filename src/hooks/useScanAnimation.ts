import { useCallback, useRef } from 'react';
import { useStore } from '../store';

export function useScanAnimation() {
  const setAnimationPhase = useStore((s) => s.setAnimationPhase);
  const timeoutsRef = useRef<number[]>([]);

  const startAnimation = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    setAnimationPhase('lines');

    const t1 = window.setTimeout(() => setAnimationPhase('stations'), 2000);
    const t2 = window.setTimeout(() => setAnimationPhase('transfers'), 3500);
    const t3 = window.setTimeout(() => setAnimationPhase('done'), 4500);

    timeoutsRef.current = [t1, t2, t3];
  }, [setAnimationPhase]);

  const skipAnimation = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    setAnimationPhase('done');
  }, [setAnimationPhase]);

  return { startAnimation, skipAnimation };
}
