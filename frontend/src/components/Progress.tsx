import React from 'react';

/**
 * Convert a byte size into a human‑readable string.
 *
 * @param size - Size in bytes (number).
 * @returns A string such as “12.34 MB”.
 */
function formatBytes(size: number): string {
  const i = size === 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
  return (
    +(size / Math.pow(1024, i)).toFixed(2) * 1 +
    ['B', 'kB', 'MB', 'GB', 'TB'][i]
  );
}

/**
 * Props for the Progress component.
 */
interface ProgressProps {
  /** Text that will appear before the percentage. */
  text: string;

  /**
   * Completion percentage (0–100).  
   * Optional – defaults to `0`.
   */
  percentage?: number;

  /**
   * Total size in bytes, used only for display purposes.  
   * Optional – if omitted or NaN it will not be shown.
   */
  total?: number;
}

/**
 * A simple progress bar that shows the given text and percentage,
 * optionally followed by a formatted byte count.
 *
 * @param props Component props
 */
const Progress: React.FC<ProgressProps> = ({
  text,
  percentage = 0,
  total,
}) => {
  return (
    <div className="w-full bg-gray-100 dark:bg-gray-700 text-left rounded-lg overflow-hidden mb-0.5">
      <div
        className="bg-blue-400 whitespace-nowrap px-1 text-sm"
        style={{ width: `${percentage}%` }}
      >
        {`${text} (${percentage.toFixed(2)}%${
          typeof total === 'number' && !isNaN(total)
            ? ` of ${formatBytes(total)}`
            : ''
        })`}
      </div>
    </div>
  );
};

export default Progress;