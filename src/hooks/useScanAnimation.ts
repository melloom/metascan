import { useCallback, useRef, useEffect } from 'react';
import { useStore } from '../store';

export function useScanAnimation() {
  const setAnimationPhase = useStore((s) => s.setAnimationPhase);
  const currentResult = useStore((s) => s.currentResult);
  const timeoutsRef = useRef<number[]>([]);

  const startAnimation = useCallback(() => {
    // Clear any pending phase transitions
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    console.log('Starting animation sequence...');
    console.log('Current result lines:', currentResult?.lines?.length || 0);
    
    // Start with lines phase immediately
    setAnimationPhase('lines');
    console.log('Phase 1: Lines');

    // Consistent timing like the demos - optimized for quality
    const lineCount = currentResult?.lines.length || 0;
    const totalStations = currentResult?.lines.reduce((sum, l) => sum + l.stations.length, 0) || 0;
    const transferCount = currentResult?.transfers.length || 0;
    
    // Demo-quality timing - consistent and smooth
    const baseLineTime = 600; // Consistent base timing
    const lineDrawDuration = Math.max(1500, baseLineTime * Math.min(lineCount, 8)); // 1.5s minimum, scales with lines
    const stationPopDuration = Math.max(1500, totalStations * 20); // 20ms per station minimum, 1.5s minimum
    const transferDuration = Math.max(800, transferCount * 100); // 100ms per transfer minimum
    
    console.log(`Demo-quality timing: lines=${lineCount}, stations=${totalStations}, transfers=${transferCount}`);
    console.log(`Durations: lines=${lineDrawDuration}ms, stations=${stationPopDuration}ms, transfers=${transferDuration}ms`);

    // Lines phase - ensure smooth transition
    const t1 = window.setTimeout(() => {
      console.log('Phase 2: Stations');
      setAnimationPhase('stations');
    }, lineDrawDuration + 100); // Increased buffer for smoother transition
    
    // Stations phase
    const t2 = window.setTimeout(() => {
      console.log('Phase 3: Transfers');
      setAnimationPhase('transfers');
    }, lineDrawDuration + stationPopDuration + 50); // Small buffer
    
    // Done phase
    const t3 = window.setTimeout(() => {
      console.log('Phase 4: Done');
      setAnimationPhase('done');
    }, lineDrawDuration + stationPopDuration + transferDuration + 100); // Final buffer

    timeoutsRef.current = [t1, t2, t3];
    
    // Force animation to start immediately
    requestAnimationFrame(() => {
      console.log('Animation started via requestAnimationFrame');
    });
  }, [setAnimationPhase, currentResult]);

  const skipAnimation = useCallback(() => {
    console.log('Skipping animation...');
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    setAnimationPhase('done');
  }, [setAnimationPhase]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  return { startAnimation, skipAnimation };
}
