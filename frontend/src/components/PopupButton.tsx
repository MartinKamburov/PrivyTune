import { useEffect, useRef, useState } from "react";

export type LLMModelDropdownProps = {
  models: string[];
  value?: string;
  onChange?: (model: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

export default function LLMModelDropdown({
  models,
  value,
  onChange,
  placeholder = "Select an LLM Model",
  className = "",
  disabled = false,
}: LLMModelDropdownProps) {
  const [open, setOpen] = useState(false);
  const [internalValue, setInternalValue] = useState<string | undefined>();
  const containerRef = useRef<HTMLDivElement | null>(null);

  const selected = value ?? internalValue;

  // Close when clicking outside (tiny, no frills)
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const choose = (model: string) => {
    if (!value) setInternalValue(model);
    onChange?.(model);
    setOpen(false);
  };

  // ← handle empty string too
  const isPlaceholder = !selected?.trim();
  const label = isPlaceholder ? placeholder : selected!;

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={[
          "w-72 inline-flex items-center justify-between rounded-xl",
          "border border-gray-300 bg-white px-4 py-2.5 text-left shadow-sm ring-1 ring-black/5",
          disabled ? "text-gray-400 bg-gray-50 cursor-not-allowed" : "hover:bg-gray-50",
          "focus:outline-none"
        ].join(" ")}
      >
        <span className={isPlaceholder ? "text-black" : "text-black truncate"}>
          {label}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-black transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06z" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-72 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-black/10">
          <ul className="max-h-64 overflow-auto p-1">
            {models.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-500">No models available</li>
            )}
            {models.map((m) => (
              <li key={m}>
                <button
                  type="button"
                  onClick={() => choose(m)}
                  title={m}
                  className={[
                    "w-full text-left truncate rounded-lg px-3 py-2 text-sm",
                    selected === m ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-800 hover:bg-indigo-50"
                  ].join(" ")}
                >
                  {m}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}