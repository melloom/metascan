import { motion } from 'framer-motion';
import { stationLabelVariants } from '../../animations';
import { getLineColor } from '../../constants/lines';
import { useStore } from '../../store';
import { STATION_RADIUS } from '../../constants/layout';
import type { Station } from '../../types';

interface Props {
  station: Station & { x: number; y: number; labelSide: 'above' | 'below' };
  stationIndex: number;
  lineIndex: number;
  animate: boolean;
  highlighted: boolean;
}

export function MetroStation({ station, stationIndex, lineIndex, animate, highlighted }: Props) {
  const theme = useStore((s) => s.theme);
  const selectedStationId = useStore((s) => s.selectedStationId);
  const selectStation = useStore((s) => s.selectStation);

  const color = getLineColor(station.lineId, theme);
  const isSelected = selectedStationId === station.id;
  const globalIndex = lineIndex * 10 + stationIndex;
  const bgColor = theme === 'dark' ? '#0a0e1a' : '#ffffff';

  // Calculate dynamic delay for station staggering - more proportional to content
  const stationDelay = globalIndex * 0.02; // Reduced from 0.03 to 0.02 for even smoother animation

  // Ensure radius is always a positive number with multiple fallbacks
  const safeRadius = Number.isFinite(STATION_RADIUS) && STATION_RADIUS > 0 ? STATION_RADIUS : 7;

  // Debug log to identify problematic stations
  if (!Number.isFinite(safeRadius) || !station.x || !station.y) {
    console.warn('Invalid station data:', { 
      stationId: station.id, 
      safeRadius, 
      x: station.x, 
      y: station.y,
      STATION_RADIUS 
    });
    return null;
  }

  const clampRadius = (value: number, fallback: number = 0) => {
    const result = Number.isFinite(value) ? Math.max(0, value) : fallback;
    if (!Number.isFinite(result)) {
      console.warn('Invalid radius calculation:', { value, fallback, result });
      return fallback;
    }
    return result;
  };

  // Ensure all radius values are strings to prevent SVG rendering issues
  const safeRadiusStr = String(clampRadius(safeRadius, 7));

  // Label positioning — directly above or below the station dot
  const isAbove = station.labelSide === 'above';
  const labelDy = isAbove ? -clampRadius(safeRadius + 6) : clampRadius(safeRadius + 14);
  const labelAnchor = 'start';

  const displayValue = station.value.length > 12 ? station.value.slice(0, 12) + '...' : station.value;

  // Create safe coordinate values that can never be undefined
  const safeX = Number.isFinite(station.x) ? station.x : 0;
  const safeY = Number.isFinite(station.y) ? station.y : 0;

  // Additional validation before rendering
  if (!Number.isFinite(safeX) || !Number.isFinite(safeY) || !Number.isFinite(safeRadius)) {
    console.error('MetroStation: Invalid rendering parameters:', { 
      stationId: station.id, 
      safeX, 
      safeY, 
      safeRadius 
    });
    return null;
  }

  return (
    <motion.g
      style={{ cursor: 'pointer', willChange: 'transform' }} // Performance optimization
      onClick={() => selectStation(station.id)}
      initial={animate ? { opacity: 0 } : undefined}
      animate={{ opacity: 1 }}
      transition={animate ? { duration: 0.05 } : undefined} // Fast initial fade-in
    >
      {/* Hit area for easier clicking */}
      <circle
        cx={safeX}
        cy={safeY}
        r={String(clampRadius(safeRadius + 8, 15))}
        fill="transparent"
      />

      {/* Highlight ring for selected/searched stations */}
      {(isSelected || highlighted) && (
        <motion.circle
          cx={safeX}
          cy={safeY}
          r={String(clampRadius(safeRadius + 6, 13))}
          fill="none"
          stroke={color}
          strokeWidth={2}
          animate={{ opacity: [0.6, 0.15, 0.6] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        />
      )}

      {/* Outer station circle — with safe animation */}
      <motion.circle
        cx={safeX}
        cy={safeY}
        fill={bgColor}
        stroke={color}
        strokeWidth={2.5}
        r={safeRadiusStr}
        initial={animate ? { opacity: 0 } : undefined}
        animate={{ opacity: 1 }}
        transition={animate ? { duration: 0.1, delay: stationDelay } : undefined}
      />

      {/* Inner fill for selected */}
      {isSelected && (
        <motion.circle
          cx={safeX}
          cy={safeY}
          r={String(clampRadius(safeRadius - 2.5, 4.5))}
          fill={color}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.1 }}
        />
      )}

      {/* Label — positioned directly next to the station */}
      <motion.g
        variants={animate ? stationLabelVariants : undefined}
        initial={animate ? 'hidden' : undefined}
        animate="visible"
        custom={stationDelay} // Use stationDelay instead of globalIndex
      >
        {/* Label background for readability */}
        <text
          x={safeX}
          y={safeY + labelDy}
          textAnchor={labelAnchor}
          fill={theme === 'dark' ? '#0a0e1a' : '#ffffff'}
          fontSize={10}
          fontWeight={isSelected ? 600 : 400}
          fontFamily="system-ui, -apple-system, sans-serif"
          stroke={theme === 'dark' ? '#0a0e1a' : '#ffffff'}
          strokeWidth={3}
          paintOrder="stroke"
        >
          {displayValue}
        </text>
        {/* Label text */}
        <text
          x={safeX}
          y={safeY + labelDy}
          textAnchor={labelAnchor}
          fill={isSelected ? color : 'var(--text-primary)'}
          fontSize={10}
          fontWeight={isSelected ? 600 : 400}
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          {displayValue}
        </text>
      </motion.g>
    </motion.g>
  );
}
