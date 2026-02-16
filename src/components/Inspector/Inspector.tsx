import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { slideInRightVariants, slideUpVariants } from '../../animations';
import { useStore } from '../../store';
import { getLineColor } from '../../constants/lines';
import { Badge, ProgressBar } from '../common';
import type { Station, Transfer } from '../../types';

function extractMetadata(rawText: string): Array<{ key: string; value: string }> {
  const metadata: Array<{ key: string; value: string }> = [];
  
  // Extract email addresses
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emails = rawText.match(emailRegex);
  if (emails) {
    emails.forEach(email => {
      metadata.push({ key: 'Email', value: email });
    });
  }
  
  // Extract phone numbers
  const phoneRegex = /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g;
  const phones = rawText.match(phoneRegex);
  if (phones) {
    phones.forEach(phone => {
      metadata.push({ key: 'Phone', value: phone });
    });
  }
  
  // Extract addresses (simple pattern)
  const addressRegex = /\d+\s+[\w\s]+,\s*[A-Z]{2}\s*\d{5}/gi;
  const addresses = rawText.match(addressRegex);
  if (addresses) {
    addresses.forEach(address => {
      metadata.push({ key: 'Address', value: address });
    });
  }
  
  // Extract JSON-LD structured data
  if (rawText.includes('@type')) {
    const typeMatch = rawText.match(/"@type"\s*:\s*"([^"]+)"/);
    if (typeMatch) {
      metadata.push({ key: 'Type', value: typeMatch[1] });
    }
  }
  
  return metadata;
}

export function Inspector() {
  const currentResult = useStore((s) => s.currentResult);
  const selectedStationId = useStore((s) => s.selectedStationId);
  const inspectorOpen = useStore((s) => s.inspectorOpen);
  const selectStation = useStore((s) => s.selectStation);
  const theme = useStore((s) => s.theme);

  const station = useMemo(() => {
    if (!currentResult || !selectedStationId) return null;
    
    // First check regular stations
    for (const line of currentResult.lines) {
      const found = line.stations.find((s) => s.id === selectedStationId);
      if (found) return found;
    }
    
    // Check if it's a virtual transfer station
    if (selectedStationId.startsWith('transfer-')) {
      const transferId = selectedStationId.replace('transfer-', '');
      const transfer = currentResult.transfers.find((t) => t.id === transferId);
      
      if (transfer) {
        const lineA = currentResult.lines.find((l) => l.id === transfer.lineIds[0]);
        const lineB = currentResult.lines.find((l) => l.id === transfer.lineIds[1]);
        
        return {
          id: selectedStationId,
          lineId: transfer.lineIds[0],
          label: 'Transfer Station',
          value: `${lineA?.name || 'Line A'} ↔ ${lineB?.name || 'Line B'}`,
          confidence: 0.8,
          evidence: [
            { 
              source: 'Transfer', 
              selector: 'intersection', 
              raw: `Transfer between ${lineA?.name || 'Line A'} and ${lineB?.name || 'Line B'}: ${transfer.reason}` 
            }
          ],
          x: 0, // Will be set by transfer positioning
          y: 0, // Will be set by transfer positioning
        };
      }
    }
    
    return null;
  }, [currentResult, selectedStationId]);

  const lineInfo = useMemo(() => {
    if (!station || !currentResult) return null;
    const line = currentResult.lines.find((l) => l.id === station.lineId);
    if (!line) return null;
    const stationIndex = line.stations.findIndex((s) => s.id === station.id);
    return { name: line.name, total: line.stations.length, index: stationIndex + 1 };
  }, [station, currentResult]);

  const relatedTransfers = useMemo(() => {
    if (!station || !currentResult) return [];
    return currentResult.transfers.filter((t) =>
      t.stationIds.includes(station.id)
    );
  }, [station, currentResult]);

  const color = station ? getLineColor(station.lineId, theme) : '';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <>
      {/* Desktop drawer */}
      <AnimatePresence>
        {inspectorOpen && station && lineInfo && (
          <motion.aside
            variants={slideInRightVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="
              hidden md:flex
              w-[340px] flex-shrink-0 h-full
              bg-[var(--bg-secondary)] border-l border-[var(--border)]
              flex-col overflow-hidden
            "
          >
            <InspectorContent
              station={station}
              lineInfo={lineInfo}
              color={color}
              transfers={relatedTransfers}
              currentResult={currentResult}
              theme={theme}
              onClose={() => selectStation(null)}
              onCopy={copyToClipboard}
            />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Mobile bottom sheet */}
      <AnimatePresence>
        {inspectorOpen && station && lineInfo && (
          <motion.div
            variants={slideUpVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="
              md:hidden fixed bottom-0 left-0 right-0 z-50
              max-h-[70vh] overflow-y-auto
              bg-[var(--bg-secondary)] border-t border-[var(--border)]
              rounded-t-2xl
            "
          >
            <div className="w-10 h-1 rounded-full bg-[var(--border)] mx-auto mt-2 mb-1" />
            <InspectorContent
              station={station}
              lineInfo={lineInfo}
              color={color}
              transfers={relatedTransfers}
              currentResult={currentResult}
              theme={theme}
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
  station: Station;
  lineInfo: { name: string; total: number; index: number };
  color: string;
  transfers: Transfer[];
  currentResult: import('../../types').ScanResult | null;
  theme: 'dark' | 'light';
  onClose: () => void;
  onCopy: (text: string) => void;
}

function InspectorContent({ station, lineInfo, color, transfers, currentResult, theme, onClose, onCopy }: ContentProps) {
  const confidencePercent = Math.round(station.confidence * 100);
  const confidenceLevel = station.confidence > 0.85 ? 'High' : station.confidence > 0.6 ? 'Medium' : 'Low';

  return (
    <div className="flex flex-col h-full">
      {/* Color accent bar at top */}
      <div className="h-1 w-full" style={{ backgroundColor: color }} />

      {/* Header */}
      <div className="px-4 pt-3 pb-3 border-b border-[var(--border)]">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Line badge and station number */}
            <div className="flex items-center gap-2 mb-2">
              <Badge label={lineInfo.name} color={color} />
              <span className="text-[10px] text-[var(--text-muted)]">
                Station {lineInfo.index} of {lineInfo.total}
              </span>
            </div>
            {/* Station label (category) */}
            <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">
              {station.label}
            </p>
            {/* Station value (main info) */}
            <div className="relative group">
              <h3 
                className="text-base font-semibold text-[var(--text-primary)] break-words leading-snug cursor-help"
                title={station.value.length > 100 ? station.value : undefined}
              >
                {station.value.length > 100 ? `${station.value.slice(0, 100)}...` : station.value}
              </h3>
              {station.value.length > 100 && (
                <div className="absolute -top-8 left-0 bg-[var(--bg-primary)] text-[var(--text-secondary)] text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                  {station.value}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] cursor-pointer flex-shrink-0 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Quick copy button */}
        <button
          onClick={() => onCopy(station.value)}
          className="mt-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors cursor-pointer"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
          Copy value
        </button>
      </div>

      {/* Confidence */}
      <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Confidence</p>
          <span className="text-sm font-semibold" style={{ color }}>{confidencePercent}%</span>
        </div>
        <ProgressBar value={station.confidence} color={color} height={6} />
        <p className="text-[10px] text-[var(--text-muted)] mt-1.5">
          {confidenceLevel} confidence
          {station.confidence > 0.85 ? ' — verified from structured data' :
           station.confidence > 0.6 ? ' — found in page metadata' :
           ' — extracted from page content'}
        </p>
        
        {/* Additional confidence details */}
        <div className="mt-2 pt-2 border-t border-[var(--border-subtle)]">
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <span className="text-[var(--text-muted)]">Data Source:</span>
              <span className="font-medium">{station.evidence[0]?.source || 'Unknown'}</span>
            </div>
            <div>
              <span className="text-[var(--text-muted)]">Evidence Count:</span>
              <span className="font-medium">{station.evidence.length}</span>
            </div>
            <div>
              <span className="text-[var(--text-muted)]">First Seen:</span>
              <span className="font-medium">{station.evidence[0]?.selector || 'N/A'}</span>
            </div>
            <div>
              <span className="text-[var(--text-muted)]">Data Type:</span>
              <span className="font-medium">{station.label}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Evidence sources */}
      <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
        <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">
          Sources ({station.evidence.length})
        </p>
        <div className="space-y-2">
          {station.evidence.map((ev, i) => (
            <div key={i} className="p-2.5 rounded-lg bg-[var(--bg-tertiary)]">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <SourceIcon source={ev.source} />
                  <span className="text-[11px] font-medium text-[var(--text-primary)]">{ev.source}</span>
                  <span className="text-[var(--text-muted)] text-[10px] font-mono truncate">{ev.selector}</span>
                </div>
                <button
                  onClick={() => onCopy(ev.raw)}
                  className="w-5 h-5 rounded flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-colors cursor-pointer"
                  title="Copy raw data"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                </button>
              </div>
              
              {/* Enhanced evidence details */}
              <div className="mt-2 p-2 rounded bg-[var(--bg-primary)] border border-[var(--border)]">
                <div className="text-[10px] text-[var(--text-secondary)] font-mono break-words leading-relaxed mb-2">
                  {ev.raw.length > 300 ? ev.raw.slice(0, 300) + '...' : ev.raw}
                </div>
                
                {/* Extracted metadata from evidence */}
                {extractMetadata(ev.raw).length > 0 && (
                  <div className="mt-2 pt-2 border-t border-[var(--border-subtle)]">
                    <p className="text-[10px] text-[var(--text-muted)] mb-1">Extracted Information:</p>
                    <div className="space-y-1">
                      {extractMetadata(ev.raw).map((meta, metaIndex) => (
                        <div key={metaIndex} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                          <span className="text-[10px] text-[var(--text-secondary)]">
                            <span className="font-medium">{meta.key}:</span> {meta.value}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onCopy(`${meta.key}: ${meta.value}`);
                            }}
                            className="w-4 h-4 rounded flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-colors cursor-pointer"
                            title="Copy metadata"
                          >
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <rect x="9" y="9" width="13" height="13" rx="2" />
                              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Evidence quality indicators */}
                <div className="mt-2 flex items-center gap-4 text-[10px] text-[var(--text-muted)]">
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-[var(--success)]" />
                    <span>Quality: High</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-[var(--warning)]" />
                    <span>Reliable</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-[var(--error)]" />
                    <span>Extracted</span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Related connections */}
      {transfers.length > 0 && (
        <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
          <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">
            Connections ({transfers.length})
          </p>
          <div className="space-y-1.5">
            {transfers.map((transfer) => {
              const otherStationId = transfer.stationIds.find((id) => id !== station.id) ?? '';
              const otherLine = currentResult?.lines.find((l) =>
                l.stations.some((s) => s.id === otherStationId)
              );
              const otherStation = otherLine?.stations.find((s) => s.id === otherStationId);
              const otherColor = otherLine ? getLineColor(otherLine.id, theme) : '';

              return (
                <div key={transfer.id} className="flex items-start gap-2 p-2 rounded-lg bg-[var(--bg-tertiary)]">
                  <div className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: otherColor }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-[var(--text-primary)] truncate">
                      {otherStation?.value && otherStation.value.length > 80 ? `${otherStation.value.slice(0, 80)}...` : otherStation?.value ?? otherStationId}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)]" style={{ color: otherColor || 'var(--text-muted)' }}>{transfer.reason}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />
    </div>
  );
}

function SourceIcon({ source }: { source: string }) {
  const iconClass = "w-3.5 h-3.5 text-[var(--text-muted)]";

  if (source === 'JSON-LD') {
    return (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
      </svg>
    );
  }

  if (source === 'Meta' || source === 'HTML') {
    return (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    );
  }

  if (source.includes('Script')) {
    return (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <polyline points="4 17 10 11 4 5" />
        <line x1="12" y1="19" x2="20" y2="19" />
      </svg>
    );
  }

  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}
