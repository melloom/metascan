import { useCallback } from 'react';
import { useStore } from './store';
import { useTheme, useScanAnimation } from './hooks';
import { runScan } from './engine/orchestrator';
import { DEMO_DATA } from './constants/demoData';
import { registerLineColor } from './constants/lines';
import { Sidebar } from './components/Sidebar';
import { MetroCanvas } from './components/Metro';
import { Inspector } from './components/Inspector';
import { InspectorToggle } from './components/Inspector';
import type { ScanStatus } from './types';

export default function App() {
  useTheme();

  const setScanStatus = useStore((s) => s.setScanStatus);
  const setScanProgress = useStore((s) => s.setScanProgress);
  const setScanError = useStore((s) => s.setScanError);
  const setCurrentResult = useStore((s) => s.setCurrentResult);
  const selectStation = useStore((s) => s.selectStation);
  const setAnimationPhase = useStore((s) => s.setAnimationPhase);
  const { startAnimation } = useScanAnimation();

  const handleScan = useCallback(async (url: string) => {
    setScanError(null);
    selectStation(null);
    setAnimationPhase('idle');
    setScanStatus('fetching');
    setScanProgress(0);

    try {
      const result = await runScan(url, (status, progress) => {
        const statusMap: Record<string, ScanStatus> = {
          'Fetching page...': 'fetching',
          'Parsing HTML...': 'parsing',
          'Extracting data...': 'extracting',
          'Detecting connections...': 'layouting',
          'Done!': 'animating',
        };
        const mapped = statusMap[status];
        if (mapped) setScanStatus(mapped);
        setScanProgress(progress);
      });

      setCurrentResult(result);
      setScanStatus('done');
      
      // Save the scan to localStorage
      setTimeout(() => {
        const saveCurrentScan = useStore.getState().saveCurrentScan;
        saveCurrentScan();
      }, 100);
      
      // Small delay to let React unmount old SVG before starting new animation
      setTimeout(() => {
        console.log('Starting animation after delay...');
        startAnimation();
      }, 200); // Increased delay for better animation start
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Scan failed');
    }
  }, [setScanStatus, setScanProgress, setScanError, setCurrentResult, selectStation, setAnimationPhase, startAnimation]);

  const handleSelectDemo = useCallback((demoId: string) => {
    const data = DEMO_DATA[demoId];
    if (!data) return;

    // Register colors from demo data
    data.lines.forEach(line => {
      registerLineColor(line.id, line.colorDark, line.colorLight);
    });

    // Clear previous state and reset animation
    selectStation(null);
    setScanStatus('done'); // Set to done immediately for demos
    setAnimationPhase('idle');

    // Use a fresh timestamp so the SVG key changes and forces a full remount
    setCurrentResult({ ...data, timestamp: Date.now() });

    // Start animation after a longer delay to ensure layout is fully computed
    setTimeout(() => {
      startAnimation();
    }, 200); // Increased delay to ensure layout computation is complete
  }, [setCurrentResult, setScanStatus, selectStation, setAnimationPhase, startAnimation]);

  const handleSelectStation = useCallback((stationId: string) => {
    selectStation(stationId);
  }, [selectStation]);

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Sidebar
        onScan={handleScan}
        onSelectDemo={handleSelectDemo}
        onSelectStation={handleSelectStation}
      />
      <MetroCanvas />
      <Inspector />
      
      {/* Inspector toggle button */}
      <InspectorToggle />
    </div>
  );
}
