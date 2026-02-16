// Core line IDs from the built-in extractors, plus any dynamic IDs from content analysis
export type CoreLineId = 'identity' | 'contacts' | 'services' | 'pages' | 'entities' | 'tech' | 'social' | 'branding' | 'schema' | 'language';
export type LineId = string;

export interface Evidence {
  source: string;
  selector: string;
  raw: string;
}

export interface Station {
  id: string;
  lineId: LineId;
  label: string;
  value: string;
  confidence: number;
  evidence: Evidence[];
  x?: number;
  y?: number;
}

export interface Line {
  id: LineId;
  name: string;
  colorDark: string;
  colorLight: string;
  stations: Station[];
  visible: boolean;
  focused: boolean;
}

export interface Transfer {
  id: string;
  stationIds: [string, string];
  lineIds: [LineId, LineId];
  reason: string;
}

export interface ScanResult {
  url: string;
  timestamp: number;
  lines: Line[];
  transfers: Transfer[];
  title: string;
  favicon?: string;
}

export interface LayoutPoint {
  x: number;
  y: number;
}

export interface LayoutSegment {
  from: LayoutPoint;
  to: LayoutPoint;
}

export interface LayoutLine {
  lineId: LineId;
  path: string;
  segments: LayoutSegment[];
  stations: Array<Station & { x: number; y: number; labelSide: 'above' | 'below' }>;
}

export interface LayoutResult {
  lines: LayoutLine[];
  transfers: Array<Transfer & { x: number; y: number }>;
  width: number;
  height: number;
}

export type Theme = 'dark' | 'light';

export type ScanStatus = 'idle' | 'fetching' | 'parsing' | 'extracting' | 'layouting' | 'animating' | 'done' | 'error';
