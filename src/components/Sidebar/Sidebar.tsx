import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store';
import { useTheme } from '../../hooks';
import { IconButton } from '../common';
import { UrlInput } from './UrlInput';
import { DemoSelector } from './DemoSelector';
import { ScanSummary } from './ScanSummary';
import { LineToggles } from './LineToggles';
import { SearchBar } from './SearchBar';
import { ExportMenu } from './ExportMenu';
import { ScanHistory } from './ScanHistory';

interface Props {
  onScan: (url: string) => void;
  onSelectDemo: (demoId: string) => void;
  onSelectStation: (stationId: string) => void;
}

export function Sidebar({ onScan, onSelectDemo, onSelectStation }: Props) {
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const setSidebarOpen = useStore((s) => s.setSidebarOpen);
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      {/* Desktop toggle button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className={`
          fixed top-3 left-3 z-40 md:flex
          w-10 h-10 rounded-xl flex items-center justify-center
          bg-[var(--bg-secondary)] border border-[var(--border)]
          text-[var(--text-primary)] cursor-pointer
          transition-all duration-300
          ${sidebarOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}
        `}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile hamburger */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="
          fixed top-3 left-3 z-50 md:hidden
          w-10 h-10 rounded-xl flex items-center justify-center
          bg-[var(--bg-secondary)] border border-[var(--border)]
          text-[var(--text-primary)] cursor-pointer
        "
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Overlay for mobile */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ x: sidebarOpen ? 0 : -280 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="
          fixed md:relative z-50 md:z-auto
          top-0 left-0 h-full w-[280px] flex-shrink-0
          bg-[var(--bg-secondary)] border-r border-[var(--border)]
          flex flex-col overflow-hidden
        "
      >
        {/* Header */}
        <div className="px-4 py-4 flex items-center justify-between border-b border-[var(--border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center">
              <svg className="w-4.5 h-4.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-bold text-[var(--text-primary)] leading-tight">MetroScan</h1>
              <p className="text-[10px] text-[var(--text-muted)]">Website Intelligence</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <IconButton
              onClick={toggleTheme}
              tooltip={theme === 'dark' ? 'Light mode' : 'Dark mode'}
              size="sm"
            >
              {theme === 'dark' ? (
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </IconButton>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-subtle)]">
          <UrlInput onScan={onScan} />
          <DemoSelector onSelectDemo={onSelectDemo} />
          <ScanSummary />
          <LineToggles />
          <SearchBar onSelectStation={onSelectStation} />
          <ExportMenu />
          <ScanHistory />
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[var(--border)] text-[10px] text-[var(--text-muted)]">
          MetroScan v1.0 — Client-side scraping
        </div>
      </motion.aside>
    </>
  );
}
