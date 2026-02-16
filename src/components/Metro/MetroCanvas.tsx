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

  // Unique key forces full SVG remount when switching scans, replaying all animations
  const layoutKey = currentResult ? `${currentResult.url}-${currentResult.timestamp}` : 'empty';

  const shouldAnimate = animationPhase !== 'done' && animationPhase !== 'idle';
  const showStations = animationPhase === 'stations' || animationPhase === 'transfers' || animationPhase === 'done';
  const showTransfers = animationPhase === 'transfers' || animationPhase === 'done';

  // Only animate when we have a valid layout and are in the correct animation phase
  const shouldAnimateLines = shouldAnimate && layout !== null && currentResult !== null;

  // Enhanced debug logging
  console.log(`MetroCanvas: animationPhase=${animationPhase}, shouldAnimate=${shouldAnimate}, shouldAnimateLines=${shouldAnimateLines}, layoutKey=${layoutKey}`);
  console.log(`MetroCanvas: currentResult exists=${!!currentResult}, layout exists=${!!layout}, lines count=${currentResult?.lines?.length || 0}`);

  return (
    <div
      className="flex-1 relative overflow-hidden bg-[var(--canvas-bg)]"
      {...handlers}
      style={{ touchAction: 'none' }}
    >
      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.08]"
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
            key={layoutKey}
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
                animate={shouldAnimateLines}
              />
            ))}

            {/* Stations */}
            {(showStations || !shouldAnimate) && layout.lines.map((layoutLine, lineIdx) => {
              const line = currentResult?.lines.find((l) => l.id === layoutLine.lineId);
              if (!line?.visible) return null;
              
              return layoutLine.stations.map((station, stationIdx) => (
                <MetroStation
                  key={station.id}
                  station={station}
                  stationIndex={stationIdx}
                  lineIndex={lineIdx}
                  animate={shouldAnimate}
                  highlighted={isStationHighlighted(station)}
                />
              ));
            })}

            {/* Transfers */}
            {(showTransfers || !shouldAnimate) && layout.transfers.map((transfer) => {
              // Check if both lines are visible
              const lineA = currentResult?.lines.find((l) => l.id === transfer.lineIds[0]);
              const lineB = currentResult?.lines.find((l) => l.id === transfer.lineIds[1]);
              if (!lineA?.visible || !lineB?.visible) return null;
              
              return (
                <MetroTransfer
                  key={transfer.id}
                  transfer={transfer}
                  animate={shouldAnimate}
                />
              );
            })}
          </svg>
        </div>
      )}

      <ScanOverlay />
      <MetroLegend />
    </div>
  );
}
