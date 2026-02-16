import { useCallback } from 'react';
import { useStore } from './store';
import { useTheme, useScanAnimation } from './hooks';
import { runScan } from './engine/orchestrator';
import { DEMO_DATA } from './constants/demoData';
import { Sidebar } from './components/Sidebar';
import { MetroCanvas } from './components/Metro';
import { Inspector } from './components/Inspector';
import type { ScanStatus } from './types';

export default function App() {
  useTheme();

  const setScanStatus = useStore((s) => s.setScanStatus);
  const setScanProgress = useStore((s) => s.setScanProgress);
  const setScanError = useStore((s) => s.setScanError);
  const setCurrentResult = useStore((s) => s.setCurrentResult);
  const selectStation = useStore((s) => s.selectStation);
  const { startAnimation } = useScanAnimation();

  const handleScan = useCallback(async (url: string) => {
    setScanError(null);
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
      startAnimation();
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Scan failed');
    }
  }, [setScanStatus, setScanProgress, setScanError, setCurrentResult, startAnimation]);

  const handleSelectDemo = useCallback((demoId: string) => {
    const data = DEMO_DATA[demoId];
    if (!data) return;
    setCurrentResult(data);
    setScanStatus('done');
    startAnimation();
  }, [setCurrentResult, setScanStatus, startAnimation]);

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
    </div>
  );
}
