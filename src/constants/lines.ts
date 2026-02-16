import type { LineId, Line } from '../types';

export interface LineDefinition {
  id: LineId;
  name: string;
  colorDark: string;
  colorLight: string;
  icon: string;
}

export const LINE_DEFINITIONS: Record<LineId, LineDefinition> = {
  identity: {
    id: 'identity',
    name: 'Identity',
    colorDark: '#FF6B6B',
    colorLight: '#E74C3C',
    icon: '🏷️',
  },
  language: {
    id: 'language',
    name: 'Language',
    colorDark: '#9B59B6',
    colorLight: '#8E44AD',
    icon: '🌐',
  },
  contacts: {
    id: 'contacts',
    name: 'Contacts',
    colorDark: '#4ECDC4',
    colorLight: '#2980B9',
    icon: '📞',
  },
  services: {
    id: 'services',
    name: 'Services',
    colorDark: '#45B7D1',
    colorLight: '#27AE60',
    icon: '🛠️',
  },
  pages: {
    id: 'pages',
    name: 'Pages',
    colorDark: '#F39C12',
    colorLight: '#E67E22',
    icon: '📄',
  },
  tech: {
    id: 'tech',
    name: 'Tech',
    colorDark: '#95A5A6',
    colorLight: '#7F8C8D',
    icon: '⚙️',
  },
  social: {
    id: 'social',
    name: 'Social',
    colorDark: '#E91E63',
    colorLight: '#C2185B',
    icon: '📱',
  },
  branding: {
    id: 'branding',
    name: 'Branding',
    colorDark: '#3498DB',
    colorLight: '#2E86DE',
    icon: '🎨',
  },
  schema: {
    id: 'schema',
    name: 'Schema',
    colorDark: '#16A085',
    colorLight: '#138D75',
    icon: '📊',
  },
  platforms: {
    id: 'platforms',
    name: 'Platforms',
    colorDark: '#90CAF9',
    colorLight: '#2196F3',
    icon: 'K',
  },
  products: {
    id: 'products',
    name: 'Products',
    colorDark: '#FF8A80',
    colorLight: '#FF5722',
    icon: 'R',
  },
  entities: {
    id: 'entities',
    name: 'Entities',
    colorDark: '#BB8FCE',
    colorLight: '#8E44AD',
    icon: 'E',
  },
};

// Runtime registry for dynamic line colors set during scan
const dynamicLineColors = new Map<string, { dark: string; light: string }>();

export function registerLineColor(lineId: string, colorDark: string, colorLight: string) {
  dynamicLineColors.set(lineId, { dark: colorDark, light: colorLight });
}

export function createEmptyLine(def: { id: LineId; name: string; colorDark: string; colorLight: string }): Line {
  // Register the color so getLineColor can find it
  registerLineColor(def.id, def.colorDark, def.colorLight);
  return {
    id: def.id,
    name: def.name,
    colorDark: def.colorDark,
    colorLight: def.colorLight,
    stations: [],
    visible: true,
    focused: false,
  };
}

export function getLineColor(lineId: LineId, theme: 'dark' | 'light'): string {
  // Handle new unique line IDs by extracting the base type
  const baseLineId = lineId.includes('-') ? lineId.split('-')[1] : lineId;
  
  // Check dynamic registry with original line ID first (for demo-specific lines)
  const dyn = dynamicLineColors.get(lineId);
  if (dyn) return theme === 'dark' ? dyn.dark : dyn.light;
  
  // Check static definitions with base line ID
  const def = Object.values(LINE_DEFINITIONS).find(d => d.id === baseLineId);
  if (def) return theme === 'dark' ? def.colorDark : def.colorLight;
  
  // Check dynamic registry with base line ID
  const dynBase = dynamicLineColors.get(baseLineId);
  if (dynBase) return theme === 'dark' ? dynBase.dark : dynBase.light;

  // Fallback to default colors based on line type
  const fallbackColors: Record<string, { dark: string; light: string }> = {
    'identity': { dark: '#FF6B6B', light: '#E74C3C' },
    'contacts': { dark: '#4ECDC4', light: '#2980B9' },
    'services': { dark: '#45B7D1', light: '#27AE60' },
    'pages': { dark: '#F7DC6F', light: '#F39C12' },
    'entities': { dark: '#BB8FCE', light: '#8E44AD' },
    'tech': { dark: '#82E0AA', light: '#16A085' },
    'products': { dark: '#FF8A80', light: '#FF5722' },
    'platforms': { dark: '#90CAF9', light: '#2196F3' },
    'social': { dark: '#FF6B9D', light: '#E91E63' },
    'branding': { dark: '#C06C84', light: '#F8B195' },
    'schema': { dark: '#6C5CE7', light: '#A55EEA' },
  };
  
  const fallback = fallbackColors[baseLineId];
  if (fallback) return theme === 'dark' ? fallback.dark : fallback.light;

  return '#888';
}
