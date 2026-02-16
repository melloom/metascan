interface Props {
  label: string;
  color?: string;
  className?: string;
}

export function Badge({ label, color, className = '' }: Props) {
  return (
    <span
      className={`
        inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium
        ${className}
      `}
      style={color ? {
        backgroundColor: `${color}20`,
        color: color,
      } : {
        backgroundColor: 'var(--badge-bg)',
        color: 'var(--badge-text)',
      }}
    >
      {label}
    </span>
  );
}
