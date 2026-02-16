import type { LineId, LayoutPoint } from '../types';

export const CANVAS_WIDTH = 1400;
export const CANVAS_HEIGHT = 900;
export const STATION_RADIUS = 6;
export const TRANSFER_RADIUS = 9;
export const LINE_WIDTH = 4;
export const LABEL_OFFSET = 16;
export const STATION_SPACING = 60;
export const LINE_SPACING = 80;
export const CORNER_RADIUS = 20;

export type Direction = 'right' | 'down-right' | 'down' | 'down-left' | 'left' | 'up-left' | 'up' | 'up-right';

export interface LineRoute {
  start: LayoutPoint;
  segments: Array<{ direction: Direction; length: number }>;
}

export const LINE_ROUTES: Record<LineId, LineRoute> = {
  identity: {
    start: { x: 100, y: 150 },
    segments: [
      { direction: 'right', length: 400 },
      { direction: 'down-right', length: 200 },
      { direction: 'right', length: 400 },
    ],
  },
  contacts: {
    start: { x: 80, y: 300 },
    segments: [
      { direction: 'right', length: 300 },
      { direction: 'down-right', length: 150 },
      { direction: 'right', length: 500 },
    ],
  },
  services: {
    start: { x: 120, y: 450 },
    segments: [
      { direction: 'right', length: 350 },
      { direction: 'up-right', length: 150 },
      { direction: 'right', length: 400 },
    ],
  },
  pages: {
    start: { x: 100, y: 600 },
    segments: [
      { direction: 'right', length: 500 },
      { direction: 'up-right', length: 200 },
      { direction: 'right', length: 300 },
    ],
  },
  entities: {
    start: { x: 150, y: 700 },
    segments: [
      { direction: 'right', length: 300 },
      { direction: 'up-right', length: 250 },
      { direction: 'right', length: 250 },
    ],
  },
  tech: {
    start: { x: 130, y: 820 },
    segments: [
      { direction: 'right', length: 400 },
      { direction: 'up-right', length: 200 },
      { direction: 'right', length: 350 },
    ],
  },
};
