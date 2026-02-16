import type { Transfer, LayoutLine } from '../types';

interface PlacedTransfer extends Transfer {
  x: number;
  y: number;
}

function findClosestPointOnPath(
  targetX: number,
  targetY: number,
  polyline: Array<{ x: number; y: number }>
): { x: number; y: number; distance: number } {
  let closestPoint = { x: polyline[0].x, y: polyline[0].y, distance: Infinity };

  for (let i = 0; i < polyline.length - 1; i++) {
    const p1 = polyline[i];
    const p2 = polyline[i + 1];

    // Find closest point on line segment
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const lengthSquared = dx * dx + dy * dy;

    if (lengthSquared === 0) {
      const dist = Math.sqrt((targetX - p1.x) ** 2 + (targetY - p1.y) ** 2);
      if (dist < closestPoint.distance) {
        closestPoint = { x: p1.x, y: p1.y, distance: dist };
      }
      continue;
    }

    let t = ((targetX - p1.x) * dx + (targetY - p1.y) * dy) / lengthSquared;
    t = Math.max(0, Math.min(1, t));

    const closestX = p1.x + t * dx;
    const closestY = p1.y + t * dy;
    const dist = Math.sqrt((targetX - closestX) ** 2 + (targetY - closestY) ** 2);

    if (dist < closestPoint.distance) {
      closestPoint = { x: closestX, y: closestY, distance: dist };
    }
  }

  return closestPoint;
}

function findSegmentIntersection(
  seg1: { from: { x: number; y: number }, to: { x: number; y: number } },
  seg2: { from: { x: number; y: number }, to: { x: number; y: number } }
): { x: number; y: number } | null {
  const x1 = seg1.from.x, y1 = seg1.from.y;
  const x2 = seg1.to.x, y2 = seg1.to.y;
  const x3 = seg2.from.x, y3 = seg2.from.y;
  const x4 = seg2.to.x, y4 = seg2.to.y;

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 0.001) return null; // Parallel lines

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y2) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x3 - x4)) / denom;

  // Check if intersection is within both segments
  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      x: x1 + t * (x2 - x1),
      y: y1 + t * (y2 - y1),
    };
  }

  return null;
}

function reconstructLinePolyline(layoutLine: LayoutLine): Array<{ x: number; y: number }> {
  // Reconstruct the polyline from the line segments
  const polyline: Array<{ x: number; y: number }> = [];
  
  // Start with the first segment's start point
  if (layoutLine.segments.length > 0) {
    polyline.push({ x: layoutLine.segments[0].from.x, y: layoutLine.segments[0].from.y });
    
    // Add intermediate points for each segment
    for (const segment of layoutLine.segments) {
      // Sample points along the segment
      const dx = segment.to.x - segment.from.x;
      const dy = segment.to.y - segment.from.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const steps = Math.max(1, Math.floor(length / 10)); // Sample every 10 pixels
      
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        polyline.push({
          x: segment.from.x + dx * t,
          y: segment.from.y + dy * t
        });
      }
    }
  }
  
  return polyline;
}

export function placeTransfers(
  transfers: Transfer[],
  layoutLines: LayoutLine[],
): PlacedTransfer[] {
  const stationPositions = new Map<string, { x: number; y: number }>();
  const linePaths = new Map<string, Array<{ x: number; y: number }>>();

  // Collect station positions and reconstruct line paths
  for (const line of layoutLines) {
    // Store station positions
    for (const station of line.stations) {
      stationPositions.set(station.id, { x: station.x, y: station.y });
    }

    // Reconstruct the actual line path from segments
    const polyline = reconstructLinePolyline(line);
    linePaths.set(line.lineId, polyline);
  }

  return transfers.map((transfer) => {
    const posA = stationPositions.get(transfer.stationIds[0]);
    const posB = stationPositions.get(transfer.stationIds[1]);

    if (!posA || !posB) {
      // For virtual transfers, create position at geometric intersection
      const lineA = linePaths.get(transfer.lineIds[0]);
      const lineB = linePaths.get(transfer.lineIds[1]);
      
      if (lineA && lineB && lineA.length >= 2 && lineB.length >= 2) {
        // Find geometric intersection between lines
        const intersection = findSegmentIntersection(
          { from: { x: lineA[0].x, y: lineA[0].y }, to: { x: lineA[1].x, y: lineA[1].y } }, 
          { from: { x: lineB[0].x, y: lineB[0].y }, to: { x: lineB[1].x, y: lineB[1].y } }
        );
        
        if (intersection) {
          return {
            ...transfer,
            x: intersection.x,
            y: intersection.y,
          };
        }
      }
      
      return { ...transfer, x: 0, y: 0 };
    }

    // Get the line paths for both lines
    const lineA = linePaths.get(transfer.lineIds[0]);
    const lineB = linePaths.get(transfer.lineIds[1]);

    if (!lineA || !lineB || lineA.length < 2 || lineB.length < 2) {
      // Fallback to midpoint if line paths aren't available
      return {
        ...transfer,
        x: (posA.x + posB.x) / 2,
        y: (posA.y + posB.y) / 2,
      };
    }

    // Find the closest point on each line path to the other station
    const closestOnA = findClosestPointOnPath(posB.x, posB.y, lineA);
    const closestOnB = findClosestPointOnPath(posA.x, posA.y, lineB);

    // For regular transfers, use geometric intersection if available
    const intersection = findSegmentIntersection(
      { from: { x: lineA[0].x, y: lineA[0].y }, to: { x: lineA[1].x, y: lineA[1].y } }, 
      { from: { x: lineB[0].x, y: lineB[0].y }, to: { x: lineB[1].x, y: lineB[1].y } }
    );
    
    let transferX, transferY;
    
    if (intersection) {
      // Use actual geometric intersection point
      transferX = intersection.x;
      transferY = intersection.y;
      
      // For hub transfers, use the optimal position from the transfer data
      if (transfer.id.startsWith('hub-')) {
        // The hub position should be calculated in the transfer detector
        // For now, use the geometric intersection as a fallback
        console.log(`Hub transfer ${transfer.id} positioned at geometric intersection: (${transferX}, ${transferY})`);
      }
    } else {
      // Position the transfer at the midpoint between closest points
      transferX = (closestOnA.x + closestOnB.x) / 2;
      transferY = (closestOnA.y + closestOnB.y) / 2;
    }

    // Ensure the transfer is positioned reasonably close to both stations
    const maxDistance = 200; // Maximum distance from stations
    const distToA = Math.sqrt((transferX - posA.x) ** 2 + (transferY - posA.y) ** 2);
    const distToB = Math.sqrt((transferX - posB.x) ** 2 + (transferY - posB.y) ** 2);

    if (distToA > maxDistance || distToB > maxDistance) {
      // If too far, fall back to midpoint
      return {
        ...transfer,
        x: (posA.x + posB.x) / 2,
        y: (posA.y + posB.y) / 2,
      };
    }

    return {
      ...transfer,
      x: transferX,
      y: transferY,
    };
  });
}
