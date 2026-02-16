import { useMemo } from 'react';
import { useStore } from '../../store';
import { useViewport, useStationSearch } from '../../hooks';
import { computeLayout } from '../../layout/metroLayout';
import { MetroLine } from './MetroLine';
import { MetroStation } from './MetroStation';
import { MetroTransfer } from './MetroTransfer';
import { MetroLegend } from './MetroLegend';
import { ScanOverlay } from './ScanOverlay';
import { EmptyState } from './EmptyState';

export function MetroCanvas() {
  const currentResult = useStore((s) => s.currentResult);
  const animationPhase = useStore((s) => s.animationPhase);
  const { transform, handlers } = useViewport();
  const { isStationHighlighted } = useStationSearch();

  const layout = useMemo(() => {
    if (!currentResult) return null;
    return computeLayout(currentResult);
  }, [currentResult]);

  const shouldAnimate = animationPhase !== 'done' && animationPhase !== 'idle';
  const showStations = animationPhase === 'stations' || animationPhase === 'transfers' || animationPhase === 'done';
  const showTransfers = animationPhase === 'transfers' || animationPhase === 'done';

  return (
    <div
      className="flex-1 relative overflow-hidden bg-[var(--canvas-bg)]"
      {...handlers}
      style={{ touchAction: 'none' }}
    >
      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(var(--canvas-grid) 1px, transparent 1px),
            linear-gradient(90deg, var(--canvas-grid) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {!currentResult && <EmptyState />}

      {layout && (
        <div className="absolute inset-0" style={{ transform, transformOrigin: 'center center' }}>
          <svg
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            className="w-full h-full"
            style={{ overflow: 'visible' }}
          >
            {/* Lines */}
            {layout.lines.map((layoutLine, i) => (
              <MetroLine
                key={layoutLine.lineId}
                layoutLine={layoutLine}
                lineIndex={i}
                animate={shouldAnimate}
              />
            ))}

            {/* Stations */}
            {(showStations || !shouldAnimate) && layout.lines.map((layoutLine, lineIdx) =>
              layoutLine.stations.map((station, stationIdx) => (
                <MetroStation
                  key={station.id}
                  station={station}
                  stationIndex={stationIdx}
                  lineIndex={lineIdx}
                  animate={shouldAnimate}
                  highlighted={isStationHighlighted(station)}
                />
              ))
            )}

            {/* Transfers */}
            {(showTransfers || !shouldAnimate) && layout.transfers.map((transfer) => (
              <MetroTransfer
                key={transfer.id}
                transfer={transfer}
                animate={shouldAnimate}
              />
            ))}
          </svg>
        </div>
      )}

      <ScanOverlay />
      <MetroLegend />
    </div>
  );
}
