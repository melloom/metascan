import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Theme, ScanStatus, ScanResult, LineId } from '../types';

interface ScanState {
  theme: Theme;
  scanStatus: ScanStatus;
  scanProgress: number;
  scanError: string | null;
  currentResult: ScanResult | null;
  selectedStationId: string | null;
  focusedLineId: LineId | null;
  searchQuery: string;
  inspectorOpen: boolean;
  sidebarOpen: boolean;
  animationPhase: 'idle' | 'lines' | 'stations' | 'transfers' | 'done';

  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setScanStatus: (status: ScanStatus) => void;
  setScanProgress: (progress: number) => void;
  setScanError: (error: string | null) => void;
  setCurrentResult: (result: ScanResult | null) => void;
  selectStation: (stationId: string | null) => void;
  setFocusedLine: (lineId: LineId | null) => void;
  toggleLineVisibility: (lineId: LineId) => void;
  setSearchQuery: (query: string) => void;
  setInspectorOpen: (open: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  setAnimationPhase: (phase: ScanState['animationPhase']) => void;
  reset: () => void;
}

const initialState = {
  theme: 'dark' as Theme,
  scanStatus: 'idle' as ScanStatus,
  scanProgress: 0,
  scanError: null,
  currentResult: null,
  selectedStationId: null,
  focusedLineId: null,
  searchQuery: '',
  inspectorOpen: false,
  sidebarOpen: true,
  animationPhase: 'idle' as const,
};

export const useStore = create<ScanState>()(
  persist(
    (set) => ({
      ...initialState,

      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      setScanStatus: (scanStatus) => set({ scanStatus }),
      setScanProgress: (scanProgress) => set({ scanProgress }),
      setScanError: (scanError) => set({ scanError, scanStatus: scanError ? 'error' : 'idle' }),
      setCurrentResult: (currentResult) => set({ currentResult }),
      selectStation: (selectedStationId) => set({ selectedStationId, inspectorOpen: !!selectedStationId }),
      setFocusedLine: (focusedLineId) => set((s) => ({
        focusedLineId: s.focusedLineId === focusedLineId ? null : focusedLineId,
      })),
      toggleLineVisibility: (lineId) => set((s) => {
        if (!s.currentResult) return {};
        return {
          currentResult: {
            ...s.currentResult,
            lines: s.currentResult.lines.map((l) =>
              l.id === lineId ? { ...l, visible: !l.visible } : l
            ),
          },
        };
      }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setInspectorOpen: (inspectorOpen) => set({ inspectorOpen }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setAnimationPhase: (animationPhase) => set({ animationPhase }),
      reset: () => set({ ...initialState, theme: undefined as never }),
    }),
    {
      name: 'metroscan-storage',
      partialize: (state) => ({ theme: state.theme }),
    }
  )
);
