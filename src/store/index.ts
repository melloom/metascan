import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Theme, ScanStatus, ScanResult, LineId } from '../types';

interface SavedScan {
  id: string;
  url: string;
  title: string;
  timestamp: number;
  result: ScanResult;
}

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
  savedScans: SavedScan[];

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
  saveCurrentScan: () => void;
  loadSavedScan: (scanId: string) => void;
  deleteSavedScan: (scanId: string) => void;
  clearSavedScans: () => void;
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
  savedScans: [] as SavedScan[],
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
        const targetLine = s.currentResult.lines.find((l) => l.id === lineId);
        const willHide = targetLine?.visible;

        // If hiding the line, clear selection/focus on that line
        let selectedStationId = s.selectedStationId;
        let inspectorOpen = s.inspectorOpen;
        let focusedLineId = s.focusedLineId;

        if (willHide) {
          // Clear selected station if it's on this line
          if (selectedStationId) {
            const isOnLine = targetLine?.stations.some((st) => st.id === selectedStationId);
            if (isOnLine) {
              selectedStationId = null;
              inspectorOpen = false;
            }
          }
          // Clear focus if this line was focused
          if (focusedLineId === lineId) {
            focusedLineId = null;
          }
        }

        return {
          selectedStationId,
          inspectorOpen,
          focusedLineId,
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
      
      // Saved scans functionality
      saveCurrentScan: () => set((state) => {
        if (!state.currentResult) return state;
        
        const newScan: SavedScan = {
          id: `scan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          url: state.currentResult.url,
          title: state.currentResult.title,
          timestamp: Date.now(),
          result: state.currentResult,
        };
        
        // Keep only the 20 most recent scans
        const updatedScans = [newScan, ...state.savedScans].slice(0, 20);
        
        return { savedScans: updatedScans };
      }),
      
      loadSavedScan: (scanId) => set((state) => {
        const scan = state.savedScans.find(s => s.id === scanId);
        if (!scan) return state;
        
        return {
          currentResult: scan.result,
          scanStatus: 'done' as ScanStatus,
          scanError: null,
          scanProgress: 1,
          selectedStationId: null,
          animationPhase: 'done' as const,
        };
      }),
      
      deleteSavedScan: (scanId) => set((state) => ({
        savedScans: state.savedScans.filter(s => s.id !== scanId),
      })),
      
      clearSavedScans: () => set({ savedScans: [] }),
    }),
    {
      name: 'metroscan-storage',
      partialize: (state) => ({ 
        theme: state.theme,
        savedScans: state.savedScans,
      }),
    }
  )
);
