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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 flex items-center justify-center bg-[var(--canvas-bg)]/80 backdrop-blur-sm z-20"
        >
          <div className="text-center space-y-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
              className="w-12 h-12 mx-auto border-2 border-[var(--accent)] border-t-transparent rounded-full"
            />
            <div className="space-y-2">
              <p className="text-sm font-medium text-[var(--text-primary)] capitalize">
                {scanStatus}...
              </p>
              <div className="w-48 mx-auto">
                <ProgressBar value={scanProgress} />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
