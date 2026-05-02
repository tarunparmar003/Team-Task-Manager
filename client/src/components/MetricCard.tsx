interface Props {
  label: string;
  value: number | string;
  tone?: 'default' | 'good' | 'warn' | 'bad';
}

const toneClass: Record<NonNullable<Props['tone']>, string> = {
  default: 'text-slate-900',
  good: 'text-emerald-600',
  warn: 'text-amber-600',
  bad: 'text-red-600',
};

export function MetricCard({ label, value, tone = 'default' }: Props) {
  return (
    <div className="card p-5">
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className={`mt-2 text-3xl font-semibold ${toneClass[tone]}`}>{value}</div>
    </div>
  );
}
