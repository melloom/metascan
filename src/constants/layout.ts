import type { LineId, LayoutPoint } from '../types';

export const CANVAS_WIDTH = 1400;
export const CANVAS_HEIGHT = 900;
export const STATION_RADIUS = 7;
export const TRANSFER_RADIUS = 9;
export const LINE_WIDTH = 3.5;
export const LABEL_OFFSET = 16;
export const STATION_SPACING = 60;
export const LINE_SPACING = 80;
export const CORNER_RADIUS = 22;

export type Direction = 'right' | 'down-right' | 'down' | 'down-left' | 'left' | 'up-left' | 'up' | 'up-right';

export interface LineRoute {
  start: LayoutPoint;
  segments: Array<{ direction: Direction; length: number }>;
}

export const LINE_ROUTES: Record<LineId, LineRoute> = {
  identity: {
    start: { x: 80, y: 120 },
    segments: [
      { direction: 'right', length: 350 },
      { direction: 'down-right', length: 180 },
      { direction: 'right', length: 420 },
    ],
  },
  contacts: {
    start: { x: 60, y: 270 },
    segments: [
      { direction: 'right', length: 280 },
      { direction: 'down-right', length: 120 },
      { direction: 'right', length: 520 },
    ],
  },
  services: {
    start: { x: 100, y: 420 },
    segments: [
      { direction: 'right', length: 400 },
      { direction: 'up-right', length: 140 },
      { direction: 'right', length: 380 },
    ],
  },
  pages: {
    start: { x: 80, y: 560 },
    segments: [
      { direction: 'right', length: 450 },
      { direction: 'down-right', length: 130 },
      { direction: 'right', length: 350 },
    ],
  },
  entities: {
    start: { x: 120, y: 690 },
    segments: [
      { direction: 'right', length: 320 },
      { direction: 'up-right', length: 160 },
      { direction: 'right', length: 350 },
    ],
  },
  tech: {
    start: { x: 90, y: 820 },
    segments: [
      { direction: 'right', length: 380 },
      { direction: 'up-right', length: 150 },
      { direction: 'right', length: 380 },
    ],
  },
};
