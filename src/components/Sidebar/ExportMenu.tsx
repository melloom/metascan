import { useStore } from '../../store';
import { exportJSON, exportCSV, exportCRM } from '../../export';

export function ExportMenu() {
  const currentResult = useStore((s) => s.currentResult);

  if (!currentResult) return null;

  const handleExport = (format: 'json' | 'csv' | 'crm') => {
    let content: string;
    let filename: string;
    let mimeType: string;

    switch (format) {
      case 'json':
        content = exportJSON(currentResult);
        filename = 'metroscan-export.json';
        mimeType = 'application/json';
        break;
      case 'csv':
        content = exportCSV(currentResult);
        filename = 'metroscan-export.csv';
        mimeType = 'text/csv';
        break;
      case 'crm':
        content = exportCRM(currentResult);
        filename = 'metroscan-crm.json';
        mimeType = 'application/json';
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="px-4 py-2">
      <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">
        Export
      </p>
      <div className="flex gap-1.5">
        {(['json', 'csv', 'crm'] as const).map((fmt) => (
          <button
            key={fmt}
            onClick={() => handleExport(fmt)}
            className="
              flex-1 px-2 py-1.5 rounded-lg text-[11px] font-medium uppercase
              bg-[var(--bg-tertiary)] text-[var(--text-secondary)]
              hover:bg-[var(--border)] hover:text-[var(--text-primary)]
              transition-colors cursor-pointer
            "
          >
            {fmt}
          </button>
        ))}
      </div>
    </div>
  );
}
