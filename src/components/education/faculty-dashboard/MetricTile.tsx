type MetricTileProps = {
  title: string;
  value: string;
  helper: string;
  tone: "blue" | "green" | "amber" | "slate";
};

export default function MetricTile({ title, value, helper, tone }: MetricTileProps) {
  const tones = {
    blue: "from-brand-500/12 to-cyan-400/10 text-brand-700 dark:text-brand-300",
    green: "from-emerald-500/12 to-teal-400/10 text-emerald-700 dark:text-emerald-300",
    amber: "from-amber-500/12 to-orange-400/10 text-amber-700 dark:text-amber-300",
    slate: "from-slate-500/12 to-slate-400/10 text-slate-700 dark:text-slate-300",
  };

  return (
    <div className={`rounded-2xl border border-gray-200 bg-gradient-to-br ${tones[tone]} px-5 py-5 dark:border-gray-800`}>
      <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">{title}</p>
      <p className="mt-3 text-3xl font-semibold text-gray-900 dark:text-white">{value}</p>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{helper}</p>
    </div>
  );
}
