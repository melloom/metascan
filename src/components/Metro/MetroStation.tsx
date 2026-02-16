import { motion } from 'framer-motion';
import { stationPopVariants, stationLabelVariants } from '../../animations';
import { getLineColor } from '../../constants/lines';
import { useStore } from '../../store';
import { STATION_RADIUS, LABEL_OFFSET } from '../../constants/layout';
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
  const labelY = station.labelSide === 'above' ? -LABEL_OFFSET : LABEL_OFFSET + 4;

  return (
    <motion.g
      style={{ cursor: 'pointer' }}
      onClick={() => selectStation(station.id)}
      variants={animate ? stationPopVariants : undefined}
      initial={animate ? 'hidden' : undefined}
      animate="visible"
      custom={globalIndex}
    >
      {/* Highlight ring */}
      {(isSelected || highlighted) && (
        <motion.circle
          cx={station.x}
          cy={station.y}
          r={STATION_RADIUS + 5}
          fill="none"
          stroke={color}
          strokeWidth={2}
          opacity={0.5}
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        />
      )}

      {/* Station dot */}
      <circle
        cx={station.x}
        cy={station.y}
        r={STATION_RADIUS}
        fill={theme === 'dark' ? '#0a0e1a' : '#ffffff'}
        stroke={color}
        strokeWidth={2.5}
      />

      {/* Inner fill for selected */}
      {isSelected && (
        <circle
          cx={station.x}
          cy={station.y}
          r={STATION_RADIUS - 2}
          fill={color}
        />
      )}

      {/* Label */}
      <motion.text
        x={station.x + 12}
        y={station.y + labelY}
        fill="var(--text-primary)"
        fontSize={11}
        fontFamily="system-ui, -apple-system, sans-serif"
        variants={animate ? stationLabelVariants : undefined}
        initial={animate ? 'hidden' : undefined}
        animate="visible"
        custom={globalIndex}
      >
        {station.value.length > 25 ? station.value.slice(0, 25) + '...' : station.value}
      </motion.text>
    </motion.g>
  );
}
