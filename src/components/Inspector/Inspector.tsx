import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { slideInRightVariants, slideUpVariants } from '../../animations';
import { useStore } from '../../store';
import { getLineColor } from '../../constants/lines';
import { Badge, ProgressBar } from '../common';

export function Inspector() {
  const currentResult = useStore((s) => s.currentResult);
  const selectedStationId = useStore((s) => s.selectedStationId);
  const inspectorOpen = useStore((s) => s.inspectorOpen);
  const selectStation = useStore((s) => s.selectStation);
  const theme = useStore((s) => s.theme);

  const station = useMemo(() => {
    if (!currentResult || !selectedStationId) return null;
    for (const line of currentResult.lines) {
      const found = line.stations.find((s) => s.id === selectedStationId);
      if (found) return found;
    }
    return null;
  }, [currentResult, selectedStationId]);

  const lineName = useMemo(() => {
    if (!station) return '';
    return currentResult?.lines.find((l) => l.id === station.lineId)?.name ?? '';
  }, [station, currentResult]);

  const color = station ? getLineColor(station.lineId, theme) : '';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <>
      {/* Desktop drawer */}
      <AnimatePresence>
        {inspectorOpen && station && (
          <motion.aside
            variants={slideInRightVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="
              hidden md:flex
              w-[320px] flex-shrink-0 h-full
              bg-[var(--bg-secondary)] border-l border-[var(--border)]
              flex-col overflow-hidden
            "
          >
            <InspectorContent
              station={station}
              lineName={lineName}
              color={color}
              onClose={() => selectStation(null)}
              onCopy={copyToClipboard}
            />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Mobile bottom sheet */}
      <AnimatePresence>
        {inspectorOpen && station && (
          <motion.div
            variants={slideUpVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="
              md:hidden fixed bottom-0 left-0 right-0 z-50
              max-h-[60vh] overflow-y-auto
              bg-[var(--bg-secondary)] border-t border-[var(--border)]
              rounded-t-2xl
            "
          >
            <div className="w-10 h-1 rounded-full bg-[var(--border)] mx-auto mt-2 mb-1" />
            <InspectorContent
              station={station}
              lineName={lineName}
              color={color}
              onClose={() => selectStation(null)}
              onCopy={copyToClipboard}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

interface ContentProps {
  station: import('../../types').Station;
  lineName: string;
  color: string;
  onClose: () => void;
  onCopy: (text: string) => void;
}

function InspectorContent({ station, lineName, color, onClose, onCopy }: ContentProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge label={lineName} color={color} />
            <Badge label={`${Math.round(station.confidence * 100)}%`} />
          </div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">
            {station.label}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Value */}
      <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
        <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Value</p>
        <div className="flex items-start gap-2">
          <p className="text-sm text-[var(--text-primary)] flex-1 break-words">{station.value}</p>
          <button
            onClick={() => onCopy(station.value)}
            className="flex-shrink-0 text-[var(--text-muted)] hover:text-[var(--accent)] cursor-pointer"
            title="Copy value"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Confidence */}
      <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
        <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider mb-2">Confidence</p>
        <ProgressBar value={station.confidence} color={color} height={6} />
        <p className="text-[11px] text-[var(--text-secondary)] mt-1">
          {Math.round(station.confidence * 100)}% — {station.confidence > 0.8 ? 'High' : station.confidence > 0.5 ? 'Medium' : 'Low'} confidence
        </p>
      </div>

      {/* Evidence */}
      <div className="px-4 py-3 flex-1 overflow-y-auto">
        <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider mb-2">
          Evidence ({station.evidence.length})
        </p>
        <div className="space-y-2">
          {station.evidence.map((ev, i) => (
            <div key={i} className="p-2 rounded-lg bg-[var(--bg-tertiary)] text-[12px]">
              <div className="flex items-center gap-2 mb-1">
                <Badge label={ev.source} />
                <span className="text-[var(--text-muted)] text-[10px] font-mono">{ev.selector}</span>
              </div>
              <p className="text-[var(--text-secondary)] break-words font-mono text-[10px] leading-relaxed">
                {ev.raw.slice(0, 150)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
