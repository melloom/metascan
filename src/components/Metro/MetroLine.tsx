import { useRef, useLayoutEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { lineFocusVariants } from '../../animations';
import { getLineColor } from '../../constants/lines';
import { useStore } from '../../store';
import type { LayoutLine } from '../../types';
import { LINE_WIDTH } from '../../constants/layout';

// Helper function to generate dynamic dash patterns
function generateDynamicDashPattern(lineIndex: number, segmentCount: number, pathLength: number): string {
  // Create unique dash patterns based on line characteristics
  const baseDashLength = Math.max(8, Math.min(20, pathLength / 100)); // Scale dash length with path
  const dashGap = Math.max(4, Math.min(12, baseDashLength * 0.6)); // Gap proportional to dash
  
  // Create variation based on line index and complexity
  const dashVariation = Math.sin(lineIndex * 1.3) * 0.3; // Organic variation
  const gapVariation = Math.cos(lineIndex * 0.9) * 0.2; // Different variation for gaps
  
  const adjustedDashLength = Math.max(5, baseDashLength + dashVariation);
  const adjustedGapLength = Math.max(3, dashGap + gapVariation);
  
  // Create different patterns based on segment count (complexity)
  let pattern: string;
  if (segmentCount <= 2) {
    // Simple lines: simple dash pattern
    pattern = `${adjustedDashLength} ${adjustedGapLength}`;
  } else if (segmentCount <= 4) {
    // Medium complexity: dash-dot pattern
    pattern = `${adjustedDashLength} ${adjustedGapLength} ${Math.max(2, adjustedDashLength * 0.3)} ${adjustedGapLength * 0.5}`;
  } else {
    // Complex lines: dash-dot-dot pattern
    pattern = `${adjustedDashLength} ${adjustedGapLength} ${Math.max(2, adjustedDashLength * 0.3)} ${adjustedGapLength * 0.5} ${Math.max(2, adjustedDashLength * 0.2)} ${adjustedGapLength * 0.3}`;
  }
  
  return pattern;
}

interface Props {
  layoutLine: LayoutLine;
  lineIndex: number;
  animate: boolean;
}

export function MetroLine({ layoutLine, lineIndex, animate }: Props) {
  const theme = useStore((s) => s.theme);
  const focusedLineId = useStore((s) => s.focusedLineId);
  const currentResult = useStore((s) => s.currentResult);
  const pathRef = useRef<SVGPathElement>(null);
  const [pathLength, setPathLength] = useState<number | null>(null);

  // Debug logging
  console.log(`MetroLine ${layoutLine.lineId}: animate=${animate}, pathLength=${pathLength}`);

  // Measure path length synchronously before paint so initial values are correct
  useLayoutEffect(() => {
    if (pathRef.current) {
      const length = pathRef.current.getTotalLength();
      setPathLength(length);
    }
  }, [layoutLine.path]);

  const line = currentResult?.lines.find((l) => l.id === layoutLine.lineId);
  if (!line?.visible) return null;

  const color = getLineColor(layoutLine.lineId, theme);
  
  // Debug logging to check color values
  console.log(`MetroLine: lineId=${layoutLine.lineId}, color=${color}, theme=${theme}`);
  
  const focusState = focusedLineId === null
    ? 'normal'
    : focusedLineId === layoutLine.lineId
    ? 'focused'
    : 'dimmed';

  // Dynamic timing based on path length and line complexity - demo-quality consistency
  const actualPathLength = pathLength || 1000;
  const segmentCount = layoutLine.segments.length;
  
  // Demo-quality timing - consistent and smooth
  const baseDuration = Math.max(0.8, Math.min(1.5, actualPathLength / 800)); // Consistent range
  const complexityFactor = Math.max(0.9, Math.min(1.3, segmentCount / 3)); // Gentle complexity scaling
  const duration = baseDuration * complexityFactor;
  
  // Consistent staggered delay - demo-quality
  const baseDelay = lineIndex * 0.35; // Consistent with animation variants
  const organicVariation = Math.sin(lineIndex * 0.5) * 0.05; // Subtle variation for natural feel
  const delay = Math.max(0, baseDelay + organicVariation);
  
  // Dynamic dash pattern based on line characteristics
  const dashPattern = generateDynamicDashPattern(lineIndex, segmentCount, actualPathLength);
  
  // Consistent glow timing - demo-quality
  const glowDuration = duration * 0.7;
  const glowDelay = delay * 0.6;

  return (
    <motion.g
      key={`${layoutLine.lineId}-${animate ? 'animating' : 'static'}-${layoutLine.path.slice(-20)}`}
      variants={lineFocusVariants}
      animate={focusState}
    >
      {/* Hidden path for measurement */}
      <path
        ref={pathRef}
        d={layoutLine.path}
        fill="none"
        stroke="none"
      />

      {/* Subtle glow under the line */}
      {theme === 'dark' && (pathLength !== null || !animate) && (
        <motion.path
          d={layoutLine.path}
          fill="none"
          stroke={color}
          strokeWidth={LINE_WIDTH + 6}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: 'blur(6px)' }}
          initial={animate ? { opacity: 0 } : { opacity: 0.1 }}
          animate={{ opacity: 0.1 }}
          transition={animate ? { 
            delay: glowDelay, 
            duration: glowDuration,
            ease: 'easeOut'
          } : undefined}
        />
      )}

      {/* Main line — draws in with strokeDashoffset and dynamic dash pattern */}
      {(pathLength !== null || !animate) && (
        <motion.path
          d={layoutLine.path}
          fill="none"
          stroke={color}
          strokeWidth={LINE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={animate ? dashPattern : actualPathLength}
          initial={animate ? {
            strokeDashoffset: actualPathLength,
            opacity: 0,
          } : {
            strokeDasharray: actualPathLength,
            strokeDashoffset: 0,
            opacity: 1,
          }}
          animate={animate ? {
            strokeDasharray: dashPattern,
            strokeDashoffset: 0,
            opacity: 1,
          } : {
            strokeDasharray: actualPathLength,
            strokeDashoffset: 0,
            opacity: 1,
          }}
          transition={animate ? {
            strokeDashoffset: { 
              duration, 
              delay, 
              ease: [0.4, 0.0, 0.2, 1] // Custom easing for more natural draw
            },
            strokeDasharray: {
              duration: duration * 0.3,
              delay: delay,
              ease: 'easeOut'
            },
            opacity: { 
              duration: duration * 0.3, 
              delay: delay * 0.5 
            },
          } : undefined}
        />
      )}
    </motion.g>
  );
}
