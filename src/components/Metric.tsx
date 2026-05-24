import { clsx } from 'clsx';

interface MetricProps {
  label: string;
  value: string;
  tone?: 'default' | 'accent' | 'danger';
}

export function Metric({ label, value, tone = 'default' }: MetricProps) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <div
        className={clsx(
          'mt-1 text-lg font-semibold',
          tone === 'accent' && 'text-lime',
          tone === 'danger' && 'text-danger'
        )}
      >
        {value}
      </div>
    </div>
  );
}
