import { motion } from 'framer-motion';

interface Props {
  onSelectDemo: (demoId: string) => void;
}

const DEMOS = [
  { id: 'restaurant', label: "Mario's Trattoria", desc: 'Restaurant' },
  { id: 'tech', label: 'NovaTech Solutions', desc: 'Tech Company' },
  { id: 'retail', label: 'Green Leaf Boutique', desc: 'Retail' },
];

export function DemoSelector({ onSelectDemo }: Props) {
  return (
    <div className="px-4 py-2">
      <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">
        Try an Example
      </p>
      <div className="space-y-1.5">
        {DEMOS.map((demo) => (
          <motion.button
            key={demo.id}
            onClick={() => onSelectDemo(demo.id)}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
            className="
              w-full text-left px-3 py-2 rounded-lg text-sm
              bg-[var(--bg-tertiary)] hover:bg-[var(--border)]
              transition-colors cursor-pointer group
            "
          >
            <span className="text-[var(--text-primary)] group-hover:text-[var(--accent)]">
              {demo.label}
            </span>
            <span className="ml-2 text-[11px] text-[var(--text-muted)]">{demo.desc}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
