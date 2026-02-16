import type { Station, Transfer, LayoutLine } from '../types';

interface LineIntersection {
  point: { x: number; y: number };
  lineAId: string;
  lineBId: string;
  stationA?: Station;
  stationB?: Station;
}

function distance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function findLineIntersections(layoutLines: LayoutLine[]): LineIntersection[] {
  const intersections: LineIntersection[] = [];

  for (let i = 0; i < layoutLines.length; i++) {
    for (let j = i + 1; j < layoutLines.length; j++) {
      const lineA = layoutLines[i];
      const lineB = layoutLines[j];

      // Safety check: ensure segments exist and are arrays
      if (!lineA.segments || !Array.isArray(lineA.segments) || !lineB.segments || !Array.isArray(lineB.segments)) {
        console.warn('Invalid segments data:', { lineA: lineA.lineId, lineB: lineB.lineId, lineASegments: lineA.segments, lineBSegments: lineB.segments });
        continue;
      }

      // Check each segment of line A against each segment of line B
      for (const segA of lineA.segments) {
        for (const segB of lineB.segments) {
          const intersection = findSegmentIntersection(segA, segB);
          if (intersection) {
            // Find closest stations to the intersection point
            const closestStationA = findClosestStation(intersection, lineA.stations);
            const closestStationB = findClosestStation(intersection, lineB.stations);

            intersections.push({
              point: intersection,
              lineAId: lineA.lineId,
              lineBId: lineB.lineId,
              stationA: closestStationA,
              stationB: closestStationB,
            });
          }
        }
      }
    }
  }

  return intersections;
}

function findSegmentIntersection(
  seg1: { from: { x: number; y: number }; to: { x: number; y: number } },
  seg2: { from: { x: number; y: number }; to: { x: number; y: number } }
): { x: number; y: number } | null {
  const x1 = seg1.from.x, y1 = seg1.from.y;
  const x2 = seg1.to.x, y2 = seg1.to.y;
  const x3 = seg2.from.x, y3 = seg2.from.y;
  const x4 = seg2.to.x, y4 = seg2.to.y;

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 0.001) return null; // Parallel lines

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

  // Check if intersection is within both segments
  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      x: x1 + t * (x2 - x1),
      y: y1 + t * (y2 - y1),
    };
  }

  return null;
}

function findClosestStation(
  point: { x: number; y: number },
  stations: Array<{ x: number; y: number } & Station>
): Station | undefined {
  if (stations.length === 0) return undefined;

  let closest = stations[0];
  let minDist = distance(point, closest);

  for (let i = 1; i < stations.length; i++) {
    const dist = distance(point, stations[i]);
    if (dist < minDist) {
      minDist = dist;
      closest = stations[i];
    }
  }

  return minDist < 150 ? closest : undefined; // Increased distance for better intersection detection
}

export function detectTransfers(layoutLines?: LayoutLine[]): Transfer[] {
  const transfers: Transfer[] = [];

  if (!layoutLines || layoutLines.length === 0) {
    // Fallback: No layout information, don't create any transfers
    return transfers;
  }

  // Find actual line intersections in the layout
  const intersections = findLineIntersections(layoutLines);
  
  // Group intersections that are very close to each other (clustering)
  const clusteredIntersections = clusterIntersections(intersections);
  
  let id = 0;

  for (const cluster of clusteredIntersections) {
    if (cluster.length === 1) {
      // Single intersection - normal transfer logic
      const intersection = cluster[0];
      
      // If no stations nearby, create a virtual station at the intersection
      if (!intersection.stationA || !intersection.stationB) {
        const virtualTransfer = createVirtualIntersectionTransfer(intersection, ++id);
        if (virtualTransfer) {
          transfers.push(virtualTransfer);
        }
        continue;
      }

      const reason = findStationRelationship(intersection.stationA, intersection.stationB);
      
      if (reason) {
        transfers.push({
          id: `transfer-${++id}`,
          stationIds: [intersection.stationA.id, intersection.stationB.id],
          lineIds: [intersection.stationA.lineId, intersection.stationB.lineId],
          reason,
        });
      }
    } else if (cluster.length > 1) {
      // Multiple intersections at same point - create a hub transfer
      const hubTransfer = createHubTransfer(cluster, ++id);
      if (hubTransfer) {
        transfers.push(hubTransfer);
      }
    }
  }

  return transfers.slice(0, 15); // Increased limit for more complex layouts
}

function createVirtualIntersectionTransfer(intersection: LineIntersection, id: number): Transfer | null {
  // Create a transfer for intersections where stations don't exist nearby
  // This represents a logical connection point between lines
  
  const lineAId = intersection.lineAId;
  const lineBId = intersection.lineBId;
  
  // Create virtual station IDs for the intersection point
  const virtualStationA = `virtual-${lineAId}-${lineBId}-A`;
  const virtualStationB = `virtual-${lineAId}-${lineBId}-B`;
  
  // Check if this is a meaningful intersection based on line types
  const meaningfulIntersection = isMeaningfulLineIntersection(lineAId, lineBId);
  
  if (!meaningfulIntersection) {
    return null;
  }
  
  return {
    id: `virtual-transfer-${id}`,
    stationIds: [virtualStationA, virtualStationB],
    lineIds: [lineAId, lineBId],
    reason: `Intersection: ${getLineConnectionReason(lineAId, lineBId)}`,
  };
}

function isMeaningfulLineIntersection(lineAId: string, lineBId: string): boolean {
  // Define which line intersections are meaningful based on business logic
  
  const meaningfulPairs = [
    ['identity', 'contacts'],     // Business identity ↔ Contact info
    ['identity', 'services'],     // Business identity ↔ Services offered
    ['contacts', 'pages'],        // Contact info ↔ Pages (like contact page)
    ['services', 'pages'],        // Services ↔ Service pages
    ['entities', 'identity'],     // People/entities ↔ Business identity
    ['entities', 'contacts'],     // People/entities ↔ Contact info
    ['tech', 'services'],         // Technology ↔ Services
    ['tech', 'pages'],            // Technology ↔ Pages (like tech blog)
  ];
  
  const pairA = [lineAId, lineBId].sort();
  
  return meaningfulPairs.some(pair => {
    const sortedPair = [...pair].sort();
    return sortedPair[0] === pairA[0] && sortedPair[1] === pairA[1];
  });
}

function getLineConnectionReason(lineAId: string, lineBId: string): string {
  const connectionReasons: Record<string, string> = {
    'identity-contacts': 'Business contact information',
    'identity-services': 'Business services offered',
    'contacts-pages': 'Contact page connection',
    'services-pages': 'Service page information',
    'entities-identity': 'Person/organization details',
    'entities-contacts': 'Contact person information',
    'tech-services': 'Technology services',
    'tech-pages': 'Technical documentation',
  };
  
  const key = [lineAId, lineBId].sort().join('-');
  return connectionReasons[key] || 'Logical connection';
}

function clusterIntersections(intersections: LineIntersection[]): LineIntersection[][] {
  const clusters: LineIntersection[][] = [];
  const clusterRadius = 40; // Reduced cluster radius for tighter clusters
  const minClusterDistance = 120; // Minimum distance between cluster centers
  
  // Simple clustering algorithm with cluster spacing
  for (const intersection of intersections) {
    let assigned = false;
    
    // Try to add to existing cluster
    for (const cluster of clusters) {
      const centerPoint = calculateClusterCenter(cluster);
      const distanceToCluster = distance(intersection.point, centerPoint);
      
      // Check if within cluster radius AND not too close to other clusters
      if (distanceToCluster < clusterRadius) {
        // Check if this cluster would be too close to any other cluster
        let tooCloseToOtherClusters = false;
        for (const otherCluster of clusters) {
          if (otherCluster === cluster) continue;
          const otherCenter = calculateClusterCenter(otherCluster);
          const distanceBetweenClusters = distance(centerPoint, otherCenter);
          if (distanceBetweenClusters < minClusterDistance) {
            tooCloseToOtherClusters = true;
            break;
          }
        }
        
        if (!tooCloseToOtherClusters) {
          cluster.push(intersection);
          assigned = true;
          break;
        }
      }
    }
    
    // Create new cluster if not assigned
    if (!assigned) {
      // Check if new cluster would be too close to existing clusters
      let tooCloseToExisting = false;
      for (const existingCluster of clusters) {
        const existingCenter = calculateClusterCenter(existingCluster);
        const distanceBetween = distance(intersection.point, existingCenter);
        if (distanceBetween < minClusterDistance) {
          tooCloseToExisting = true;
          break;
        }
      }
      
      if (!tooCloseToExisting) {
        clusters.push([intersection]);
      }
    }
  }
  
  return clusters;
}

function calculateClusterCenter(cluster: LineIntersection[]): { x: number; y: number } {
  const sumX = cluster.reduce((sum, i) => sum + i.point.x, 0);
  const sumY = cluster.reduce((sum, i) => sum + i.point.y, 0);
  return {
    x: sumX / cluster.length,
    y: sumY / cluster.length
  };
}

function createHubTransfer(cluster: LineIntersection[], id: number): Transfer | null {
  if (cluster.length < 2) return null;
  
  // Get all unique stations from the cluster
  const uniqueStations = new Map<string, Station>();
  const uniqueLineIds = new Set<string>();
  
  for (const intersection of cluster) {
    if (intersection.stationA) {
      uniqueStations.set(intersection.stationA.id, intersection.stationA);
      uniqueLineIds.add(intersection.stationA.lineId);
    }
    if (intersection.stationB) {
      uniqueStations.set(intersection.stationB.id, intersection.stationB);
      uniqueLineIds.add(intersection.stationB.lineId);
    }
  }
  
  const stationIds = Array.from(uniqueStations.keys());
  const lineIds = Array.from(uniqueLineIds);
  
  // Only create hub if we have exactly 2 different lines
  if (lineIds.length !== 2 || stationIds.length !== 2) return null;
  
  return {
    id: `hub-${id}`,
    stationIds: [stationIds[0], stationIds[1]], // Exactly 2 stationIds
    lineIds: [lineIds[0], lineIds[1]], // Exactly 2 lineIds
    reason: `Hub: ${lineIds.join(' ↔ ')}`,
  };
}

function findStationRelationship(stationA: Station, stationB: Station): string | null {
  // Only create transfers for stations that have actual semantic relationships
  const valueA = stationA.value.toLowerCase();
  const valueB = stationB.value.toLowerCase();
  const labelA = stationA.label.toLowerCase();
  const labelB = stationB.label.toLowerCase();

  // Exact match (strong connection)
  if (valueA === valueB && valueA.length > 3) {
    return `Exact match: "${valueA}"`;
  }

  // One contains the other (e.g., address components, location data)
  if (valueA.length > 5 && valueB.includes(valueA)) {
    return `Location match: "${stationA.value}" in "${stationB.value}"`;
  }
  if (valueB.length > 5 && valueA.includes(valueB)) {
    return `Location match: "${stationB.value}" in "${stationA.value}"`;
  }

  // Same category with high similarity - business logic connections
  if (labelA === labelB && valueA.length > 2 && valueB.length > 2) {
    const similarity = calculateSimilarity(valueA, valueB);
    if (similarity > 0.7) {
      return `Business connection: ${labelA} (${Math.round(similarity * 100)}% match)`;
    }
  }

  // Cross-category meaningful connections
  const crossCategoryConnections = findCrossCategoryConnections(stationA, stationB);
  if (crossCategoryConnections) {
    return crossCategoryConnections;
  }

  // Geographic or contact relationships
  const geographicConnections = findGeographicConnections(stationA, stationB);
  if (geographicConnections) {
    return geographicConnections;
  }

  return null;
}

function findCrossCategoryConnections(stationA: Station, stationB: Station): string | null {
  const valueA = stationA.value.toLowerCase();
  const valueB = stationB.value.toLowerCase();
  const labelA = stationA.label.toLowerCase();
  const labelB = stationB.label.toLowerCase();

  // Business name ↔ Service connection
  if ((labelA === 'business name' || labelA === 'name') && labelB === 'service') {
    if (valueB.includes('catering') || valueB.includes('delivery') || valueB.includes('consulting')) {
      return `Business service: ${valueA} offers ${valueB}`;
    }
  }
  
  if ((labelB === 'business name' || labelB === 'name') && labelA === 'service') {
    if (valueA.includes('catering') || valueA.includes('delivery') || valueA.includes('consulting')) {
      return `Business service: ${valueB} offers ${valueA}`;
    }
  }

  // Location ↔ Contact connection
  if ((labelA.includes('address') || labelA.includes('location')) && labelB.includes('phone')) {
    return `Contact location: Phone for ${valueA}`;
  }
  if ((labelB.includes('address') || labelB.includes('location')) && labelA.includes('phone')) {
    return `Contact location: Phone for ${valueB}`;
  }

  // Service ↔ Page connection
  if (labelA === 'service' && labelB === 'page') {
    return `Service page: ${valueA} on ${valueB}`;
  }
  if (labelB === 'service' && labelA === 'page') {
    return `Service page: ${valueB} on ${valueA}`;
  }

  return null;
}

function findGeographicConnections(stationA: Station, stationB: Station): string | null {
  const valueA = stationA.value.toLowerCase();
  const valueB = stationB.value.toLowerCase();

  // City/state connections
  const cities = ['new york', 'los angeles', 'chicago', 'houston', 'phoenix', 'philadelphia', 'san antonio', 'san diego', 'dallas', 'san jose'];
  const states = ['ny', 'ca', 'il', 'tx', 'az', 'pa', 'fl', 'oh', 'ga', 'nc'];
  
  for (const city of cities) {
    if (valueA.includes(city) && valueB.includes(city)) {
      return `Location: Both in ${city}`;
    }
  }
  
  for (const state of states) {
    if ((valueA.includes(state) || valueA.includes(state.toUpperCase())) && 
        (valueB.includes(state) || valueB.includes(state.toUpperCase()))) {
      return `Location: Both in ${state.toUpperCase()}`;
    }
  }

  // Postal code connections
  const zipCodeA = valueA.match(/\b\d{5}\b/);
  const zipCodeB = valueB.match(/\b\d{5}\b/);
  if (zipCodeA && zipCodeB && zipCodeA[0] === zipCodeB[0]) {
    return `Location: Same postal code ${zipCodeA[0]}`;
  }

  return null;
}

function calculateSimilarity(a: string, b: string): number {
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator, // substitution
      );
    }
  }

  return matrix[str2.length][str1.length];
}
