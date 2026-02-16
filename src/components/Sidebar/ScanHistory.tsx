import { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../store';

export function ScanHistory() {
  const { savedScans, loadSavedScan, deleteSavedScan, clearSavedScans } = useStore();
  const [isExpanded, setIsExpanded] = useState(false);

  if (savedScans.length === 0) {
    return null;
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleLoadScan = (scanId: string) => {
    loadSavedScan(scanId);
    setIsExpanded(false);
  };

  const handleDeleteScan = (e: React.MouseEvent, scanId: string) => {
    e.stopPropagation();
    deleteSavedScan(scanId);
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Clear all saved scans? This cannot be undone.')) {
      clearSavedScans();
      setIsExpanded(false);
    }
  };

  return (
    <div className="px-4 py-3 border-t border-[var(--border-primary)]">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left text-sm font-medium text-[var(--text-primary)] hover:text-[var(--text-secondary)] transition-colors"
      >
        <span>Recent Scans ({savedScans.length})</span>
        <motion.svg
          animate={{ rotate: isExpanded ? 180 : 0 }}
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </motion.svg>
      </button>

      <motion.div
        animate={{ height: isExpanded ? 'auto' : 0, opacity: isExpanded ? 1 : 0 }}
        initial={{ height: 0, opacity: 0 }}
        className="overflow-hidden"
      >
        <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
          {savedScans.map((scan) => (
            <motion.div
              key={scan.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="group flex items-center justify-between p-2 rounded-lg bg-[var(--input-bg)] hover:bg-[var(--input-hover)] transition-colors cursor-pointer"
              onClick={() => handleLoadScan(scan.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                  {scan.title}
                </div>
                <div className="text-xs text-[var(--text-muted)] truncate">
                  {scan.url}
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  {formatDate(scan.timestamp)}
                </div>
              </div>
              <button
                onClick={(e) => handleDeleteScan(e, scan.id)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded text-[var(--text-muted)] hover:text-red-400 hover:bg-red-400/10 transition-all"
                title="Delete scan"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </motion.div>
          ))}
          
          {savedScans.length > 1 && (
            <button
              onClick={handleClearAll}
              className="w-full mt-2 p-2 text-xs text-center text-[var(--text-muted)] hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
            >
              Clear All Scans
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
