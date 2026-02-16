import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store';
import { ProgressBar } from '../common';

export function ScanOverlay() {
  const scanStatus = useStore((s) => s.scanStatus);
  const scanProgress = useStore((s) => s.scanProgress);

  const isScanning = scanStatus !== 'idle' && scanStatus !== 'done' && scanStatus !== 'error';

  return (
    <AnimatePresence>
      {isScanning && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ type: 'spring', stiffness: 280, damping: 26 }}
          className="pointer-events-none fixed bottom-6 right-6 z-30"
        >
          <div className="pointer-events-auto w-72 rounded-2xl bg-[var(--panel)] shadow-xl border border-white/5 backdrop-blur-md px-4 py-3 space-y-3">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full"
              />
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Scanning</p>
                <p className="text-sm font-semibold text-[var(--text-primary)] capitalize">{scanStatus}</p>
              </div>
            </div>
            <ProgressBar value={scanProgress} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
