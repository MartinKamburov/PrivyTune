interface ProgressProps {
  text: string;
  /** 0..100 */
  percentage?: number;
  /** total bytes, if known */
  total?: number;
}

function formatBytes(size: number): string {
  if (!Number.isFinite(size) || size <= 0) return "0B";
  const units = ["B", "kB", "MB", "GB", "TB"] as const;
  const i = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  const val = Number((size / Math.pow(1024, i)).toFixed(2));
  return `${val}${units[i]}`;
}

export default function Progress({ text, percentage, total }: ProgressProps) {
  const pct = percentage ?? 0;
  const showTotal = typeof total === "number" && !Number.isNaN(total);

  return (
    <div className="w-full bg-gray-100 dark:bg-gray-700 text-left rounded-lg overflow-hidden mb-0.5">
      <div className="bg-blue-400 whitespace-nowrap px-1 text-sm" style={{ width: `${pct}%` }}>
        {text} ({pct.toFixed(2)}%{showTotal ? ` of ${formatBytes(total!)}` : ""})
      </div>
    </div>
  );
}
