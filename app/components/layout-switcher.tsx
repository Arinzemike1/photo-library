"use client";

import { Columns2, Grid3X3 } from "lucide-react";

type LayoutType = "comfortable" | "compact";

interface LayoutSwitcherProps {
  layout: LayoutType;
  setLayout: (layout: LayoutType) => void;
}

const layouts: {
  id: LayoutType;
  label: string;
  icon: typeof Columns2;
}[] = [
  { id: "comfortable", label: "Comfortable", icon: Columns2 },
  { id: "compact", label: "Compact", icon: Grid3X3 },
];

export function LayoutSwitcher({ layout, setLayout }: LayoutSwitcherProps) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-neutral-200 bg-white p-1">
      {layouts.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => setLayout(id)}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${
            layout === id
              ? "bg-neutral-900 text-white"
              : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700"
          }`}
          title={label}
          aria-label={`${label} layout`}
        >
          <Icon size={16} />
          {/* Show text on desktop (md and up), hide on mobile */}
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
