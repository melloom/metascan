import type { LineId, Line } from '../types';

export interface LineDefinition {
  id: LineId;
  name: string;
  colorDark: string;
  colorLight: string;
  icon: string;
}

export const LINE_DEFINITIONS: LineDefinition[] = [
  { id: 'identity', name: 'Identity', colorDark: '#FF6B6B', colorLight: '#E74C3C', icon: 'M' },
  { id: 'contacts', name: 'Contacts', colorDark: '#4ECDC4', colorLight: '#2980B9', icon: 'C' },
  { id: 'services', name: 'Services', colorDark: '#45B7D1', colorLight: '#27AE60', icon: 'S' },
  { id: 'pages', name: 'Pages', colorDark: '#F7DC6F', colorLight: '#F39C12', icon: 'P' },
  { id: 'entities', name: 'Entities', colorDark: '#BB8FCE', colorLight: '#8E44AD', icon: 'E' },
  { id: 'tech', name: 'Tech', colorDark: '#82E0AA', colorLight: '#16A085', icon: 'T' },
];

export function createEmptyLine(def: LineDefinition): Line {
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
  const def = LINE_DEFINITIONS.find(d => d.id === lineId);
  if (!def) return '#888';
  return theme === 'dark' ? def.colorDark : def.colorLight;
}
