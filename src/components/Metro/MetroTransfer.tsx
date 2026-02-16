import { motion } from 'framer-motion';
import { transferVariants } from '../../animations';
import { TRANSFER_RADIUS } from '../../constants/layout';
import { useStore } from '../../store';
import { getLineColor } from '../../constants/lines';
import type { Transfer } from '../../types';

interface Props {
  transfer: Transfer & { x: number; y: number };
  animate: boolean;
}

export function MetroTransfer({ transfer, animate }: Props) {
  const theme = useStore((s) => s.theme);
  const currentResult = useStore((s) => s.currentResult);
  const selectStation = useStore((s) => s.selectStation);

  // TEMPORARILY DISABLE ANIMATIONS TO TEST
  animate = false;

  if (transfer.x === 0 && transfer.y === 0) return null;

  // Check if both lines are visible
  const lineA = currentResult?.lines.find((l) => l.id === transfer.lineIds[0]);
  const lineB = currentResult?.lines.find((l) => l.id === transfer.lineIds[1]);
  if (!lineA?.visible || !lineB?.visible) return null;

  const bgColor = theme === 'dark' ? '#0a0e1a' : '#ffffff';
  const colorA = getLineColor(transfer.lineIds[0], theme);
  const colorB = getLineColor(transfer.lineIds[1], theme);

  // Get line names for label
  const lineNameA = lineA?.name || 'Line A';
  const lineNameB = lineB?.name || 'Line B';

  // Create a virtual station for the transfer to show in inspector
  const handleTransferClick = () => {
    // Create a virtual station representing this transfer
    const virtualStation = {
      id: `transfer-${transfer.id}`,
      lineId: transfer.lineIds[0], // Use first line as primary
      label: 'Transfer Station',
      value: `${lineNameA} ↔ ${lineNameB}`,
      confidence: 0.8,
      evidence: [
        { 
          source: 'Transfer', 
          selector: 'intersection', 
          raw: `Transfer between ${lineNameA} and ${lineNameB}: ${transfer.reason}` 
        }
      ],
      x: transfer.x,
      y: transfer.y,
    };
    
    selectStation(virtualStation.id);
  };

  // Ensure radius is always a positive number with multiple fallbacks
  const safeRadius = Number.isFinite(TRANSFER_RADIUS) && TRANSFER_RADIUS > 0 ? TRANSFER_RADIUS : 9;

  // Debug log to identify problematic transfers
  if (!Number.isFinite(safeRadius) || !transfer.x || !transfer.y) {
    console.warn('Invalid transfer data:', { 
      transferId: transfer.id, 
      safeRadius, 
      x: transfer.x, 
      y: transfer.y,
      TRANSFER_RADIUS 
    });
    return null;
  }

  const clampRadius = (value: number, fallback: number = 0) => {
    const result = Number.isFinite(value) ? Math.max(0, value) : fallback;
    if (!Number.isFinite(result)) {
      console.warn('Invalid transfer radius calculation:', { value, fallback, result });
      return fallback;
    }
    return result;
  };

  // Create safe coordinate values that can never be undefined
  const safeX = Number.isFinite(transfer.x) ? transfer.x : 0;
  const safeY = Number.isFinite(transfer.y) ? transfer.y : 0;

  // Additional validation before rendering
  if (!Number.isFinite(safeX) || !Number.isFinite(safeY) || !Number.isFinite(safeRadius)) {
    console.error('MetroTransfer: Invalid rendering parameters:', { 
      transferId: transfer.id, 
      safeX, 
      safeY, 
      safeRadius 
    });
    return null;
  }

  return (
    <motion.g
      variants={animate ? transferVariants : undefined}
      initial={animate ? 'hidden' : undefined}
      animate="visible"
      style={{ cursor: 'pointer' }}
      onClick={handleTransferClick}
    >
      {/* Outer ring with enhanced gradient showing both lines */}
      <defs>
        <linearGradient id={`gradient-${transfer.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colorA} stopOpacity={0.9} />
          <stop offset="50%" stopColor={colorA} stopOpacity={0.7} />
          <stop offset="50%" stopColor={colorB} stopOpacity={0.7} />
          <stop offset="100%" stopColor={colorB} stopOpacity={0.9} />
        </linearGradient>
      </defs>
      
      {/* Outer ring - thicker and more prominent */}
      <circle
        cx={safeX}
        cy={safeY}
        r={String(clampRadius(safeRadius + 3, 12))}
        fill="none"
        stroke={`url(#gradient-${transfer.id})`}
        strokeWidth={3}
        opacity={0.9}
      />
      
      {/* Secondary ring for better visibility */}
      <circle
        cx={safeX}
        cy={safeY}
        r={String(clampRadius(safeRadius + 1, 10))}
        fill="none"
        stroke={`url(#gradient-${transfer.id})`}
        strokeWidth={2}
        opacity={0.7}
      />
      
      {/* Inner filled circle with subtle gradient */}
      <defs>
        <radialGradient id={`inner-gradient-${transfer.id}`}>
          <stop offset="0%" stopColor={colorA} stopOpacity={0.3} />
          <stop offset="100%" stopColor={colorB} stopOpacity={0.3} />
        </radialGradient>
      </defs>
      <circle
        cx={safeX}
        cy={safeY}
        r={String(clampRadius(safeRadius - 1, 8))}
        fill={`url(#inner-gradient-${transfer.id})`}
        stroke={bgColor}
        strokeWidth={1}
      />
      
      {/* Center dot showing connection - larger and more prominent */}
      <defs>
        <radialGradient id={`center-gradient-${transfer.id}`}>
          <stop offset="0%" stopColor={colorA} />
          <stop offset="50%" stopColor={colorA} />
          <stop offset="50%" stopColor={colorB} />
          <stop offset="100%" stopColor={colorB} />
        </radialGradient>
      </defs>
      <circle
        cx={safeX}
        cy={safeY}
        r="4"
        fill={`url(#center-gradient-${transfer.id})`}
        stroke={bgColor}
        strokeWidth={0.5}
      />
      
      {/* Highlight ring around center dot */}
      <circle
        cx={safeX}
        cy={safeY}
        r="6"
        fill="none"
        stroke={`url(#gradient-${transfer.id})`}
        strokeWidth={1}
        opacity={0.6}
      />

      {/* Transfer label */}
      <g>
        {/* Label background */}
        <text
          x={safeX}
          y={safeY - clampRadius(safeRadius + 8, 17)}
          textAnchor="middle"
          fill={theme === 'dark' ? '#0a0e1a' : '#ffffff'}
          fontSize={9}
          fontWeight={500}
          fontFamily="system-ui, -apple-system, sans-serif"
          stroke={theme === 'dark' ? '#0a0e1a' : '#ffffff'}
          strokeWidth={3}
          paintOrder="stroke"
        >
          {`${lineNameA} ↔ ${lineNameB}`}
        </text>
        
        {/* Label text */}
        <text
          x={safeX}
          y={safeY - clampRadius(safeRadius + 8, 17)}
          textAnchor="middle"
          fill={`url(#gradient-${transfer.id})`}
          fontSize={9}
          fontWeight={500}
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          {`${lineNameA} ↔ ${lineNameB}`}
        </text>

        {/* Connection reason */}
        <text
          x={safeX}
          y={safeY - clampRadius(safeRadius + 20, 29)}
          textAnchor="middle"
          fill={theme === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'}
          fontSize={8}
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          {transfer.reason.length > 30 ? transfer.reason.slice(0, 30) + '...' : transfer.reason}
        </text>
      </g>
    </motion.g>
  );
}
