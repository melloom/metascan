import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../store';
import { ProgressBar } from '../common';

interface Props {
  onScan: (url: string) => void;
}

export function UrlInput({ onScan }: Props) {
  const [url, setUrl] = useState('');
  const scanStatus = useStore((s) => s.scanStatus);
  const scanProgress = useStore((s) => s.scanProgress);
  const scanError = useStore((s) => s.scanError);

  const isScanning = scanStatus !== 'idle' && scanStatus !== 'done' && scanStatus !== 'error';

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!url.trim() || isScanning) return;
    onScan(url.trim());
  };

  return (
    <div className="px-4 py-3">
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="relative">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste a website URL..."
            disabled={isScanning}
            className="
              w-full px-3 py-2.5 rounded-lg text-sm
              bg-[var(--input-bg)] border border-[var(--input-border)]
              text-[var(--text-primary)] placeholder:text-[var(--text-muted)]
              focus:outline-none focus:border-[var(--input-focus)] focus:ring-1 focus:ring-[var(--input-focus)]
              disabled:opacity-50 transition-colors
            "
          />
        </div>

        <motion.button
          type="submit"
          disabled={!url.trim() || isScanning}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="
            w-full py-2.5 rounded-lg text-sm font-semibold
            bg-[var(--accent)] text-white
            hover:bg-[var(--accent-hover)]
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-colors cursor-pointer
          "
        >
          {isScanning ? 'Scanning...' : 'Scan Website'}
        </motion.button>
      </form>

      {isScanning && (
        <div className="mt-3 space-y-1">
          <ProgressBar value={scanProgress} />
          <p className="text-[11px] text-[var(--text-muted)] capitalize">{scanStatus}...</p>
        </div>
      )}

      {scanError && (
        <p className="mt-2 text-[11px] text-red-400">{scanError}</p>
      )}
    </div>
  );
}
