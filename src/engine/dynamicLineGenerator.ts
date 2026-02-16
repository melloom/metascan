import type { LineId, Station } from '../types';

// Line definition interface
interface LineDefinition {
  id: LineId;
  name: string;
  colorDark: string;
  colorLight: string;
  icon?: string; // Optional icon for UI
}

// Dynamic line categories based on content patterns
const CONTENT_PATTERNS = {
  'business': {
    keywords: ['business', 'company', 'corporate', 'enterprise', 'organization'],
    color: { dark: '#FF6B6B', light: '#E74C3C' },
    icon: 'B'
  },
  'retail': {
    keywords: ['shop', 'store', 'retail', 'product', 'buy', 'purchase', 'cart'],
    color: { dark: '#4ECDC4', light: '#2980B9' },
    icon: 'R'
  },
  'services': {
    keywords: ['service', 'consulting', 'professional', 'solution', 'expert'],
    color: { dark: '#45B7D1', light: '#27AE60' },
    icon: 'S'
  },
  'technology': {
    keywords: ['tech', 'software', 'app', 'platform', 'digital', 'online'],
    color: { dark: '#82E0AA', light: '#16A085' },
    icon: 'T'
  },
  'content': {
    keywords: ['blog', 'article', 'content', 'media', 'news', 'publication'],
    color: { dark: '#F7DC6F', light: '#F39C12' },
    icon: 'C'
  },
  'education': {
    keywords: ['school', 'university', 'education', 'learn', 'course', 'training'],
    color: { dark: '#BB8FCE', light: '#8E44AD' },
    icon: 'E'
  },
  'healthcare': {
    keywords: ['health', 'medical', 'hospital', 'clinic', 'doctor', 'pharmacy'],
    color: { dark: '#85C1E2', light: '#3498DB' },
    icon: 'H'
  },
  'finance': {
    keywords: ['bank', 'finance', 'money', 'investment', 'insurance', 'loan'],
    color: { dark: '#F8B739', light: '#F39C12' },
    icon: 'F'
  },
  'travel': {
    keywords: ['travel', 'hotel', 'flight', 'vacation', 'tour', 'destination'],
    color: { dark: '#52C77E', light: '#27AE60' },
    icon: 'V'
  },
  'food': {
    keywords: ['restaurant', 'food', 'dining', 'cafe', 'bar', 'menu'],
    color: { dark: '#EC7063', light: '#E74C3C' },
    icon: 'F'
  }
};

// Generate dynamic lines based on page content
export function generateDynamicLines(stations: Station[]): LineDefinition[] {
  // Analyze content to determine website type
  const contentText = stations.map(s => `${s.label} ${s.value}`).join(' ').toLowerCase();
  const detectedCategories = new Map<string, number>();

  // Score each category based on keyword matches
  for (const [category, pattern] of Object.entries(CONTENT_PATTERNS)) {
    let score = 0;
    for (const keyword of pattern.keywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = contentText.match(regex);
      if (matches) score += matches.length;
    }
    if (score > 0) {
      detectedCategories.set(category, score);
    }
  }

  // Sort categories by score and take top 3-5
  const sortedCategories = Array.from(detectedCategories.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, Math.min(5, detectedCategories.size));

  // Always include some core lines if there's relevant data
  const coreLines = [];
  if (stations.some(s => s.label.includes('Name') || s.label.includes('Business'))) {
    coreLines.push('identity');
  }
  if (stations.some(s => s.label.includes('Phone') || s.label.includes('Email') || s.label.includes('Address'))) {
    coreLines.push('contacts');
  }

  // Generate line definitions
  const lineDefs: LineDefinition[] = [];
  const usedIds = new Set<string>();

  // Add core lines first
  for (const coreId of coreLines) {
    if (!usedIds.has(coreId)) {
      const def = getCoreLineDefinition(coreId);
      if (def) {
        lineDefs.push(def);
        usedIds.add(coreId);
      }
    }
  }

  // Add dynamic category lines
  for (const [category] of sortedCategories) {
    const lineId = `dynamic-${category}`;
    if (!usedIds.has(lineId)) {
      const pattern = CONTENT_PATTERNS[category as keyof typeof CONTENT_PATTERNS];
      lineDefs.push({
        id: lineId as LineId,
        name: category.charAt(0).toUpperCase() + category.slice(1),
        colorDark: pattern.color.dark,
        colorLight: pattern.color.light,
        icon: pattern.icon
      });
      usedIds.add(lineId);
    }
  }

  // Ensure we have at least 3 lines
  if (lineDefs.length < 3) {
    const fallbackLines = ['pages', 'entities', 'tech'];
    for (const fallbackId of fallbackLines) {
      if (!usedIds.has(fallbackId)) {
        const def = getCoreLineDefinition(fallbackId);
        if (def) {
          lineDefs.push(def);
          usedIds.add(fallbackId);
        }
      }
      if (lineDefs.length >= 3) break;
    }
  }

  return lineDefs;
}

function getCoreLineDefinition(id: string): LineDefinition | null {
  const coreDefs: Record<string, LineDefinition> = {
    'identity': { id: 'identity' as LineId, name: 'Identity', colorDark: '#FF6B6B', colorLight: '#E74C3C', icon: 'M' },
    'contacts': { id: 'contacts' as LineId, name: 'Contacts', colorDark: '#4ECDC4', colorLight: '#2980B9', icon: 'C' },
    'services': { id: 'services' as LineId, name: 'Services', colorDark: '#45B7D1', colorLight: '#27AE60', icon: 'S' },
    'pages': { id: 'pages' as LineId, name: 'Pages', colorDark: '#F7DC6F', colorLight: '#F39C12', icon: 'P' },
    'entities': { id: 'entities' as LineId, name: 'Entities', colorDark: '#BB8FCE', colorLight: '#8E44AD', icon: 'E' },
    'tech': { id: 'tech' as LineId, name: 'Tech', colorDark: '#82E0AA', colorLight: '#16A085', icon: 'T' },
  };
  
  return coreDefs[id] || null;
}

// Assign stations to appropriate lines based on content analysis
export function assignStationsToLines(stations: Station[], lineDefs: LineDefinition[]): Station[] {
  return stations.map(station => {
    // Keep original lineId for core lines
    if (lineDefs.some(def => def.id === station.lineId)) {
      return station;
    }

    // Find best dynamic line for this station
    const stationText = `${station.label} ${station.value}`.toLowerCase();
    
    for (const lineDef of lineDefs) {
      if (lineDef.id.startsWith('dynamic-')) {
        const category = lineDef.id.replace('dynamic-', '');
        const pattern = CONTENT_PATTERNS[category as keyof typeof CONTENT_PATTERNS];
        
        // Check if station matches this category
        for (const keyword of pattern.keywords) {
          if (stationText.includes(keyword)) {
            return { ...station, lineId: lineDef.id as LineId };
          }
        }
      }
    }

    // Default to first available line
    return { ...station, lineId: lineDefs[0]?.id as LineId || 'identity' as LineId };
  });
}
