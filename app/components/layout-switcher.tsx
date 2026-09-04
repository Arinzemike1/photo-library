"use client";

import { useGalleryStore, GalleryLayout } from "@/lib/store";
import { Grid3X3, Columns2 } from "lucide-react";

const layouts: { id: GalleryLayout; label: string; icon: typeof Grid3X3 }[] = [
  { id: "comfortable", label: "Comfortable", icon: Columns2 },
  { id: "compact", label: "Compact", icon: Grid3X3 },
];

export function LayoutSwitcher() {
  const { layout, setLayout } = useGalleryStore();

  return (
    <div className="flex items-center gap-1 rounded-xl border border-neutral-200 bg-white p-1">
      {layouts.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => setLayout(id)}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${
            layout === id
              ? "bg-neutral-900 text-white"
              : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700"
          }`}
          title={label}
        >
          <Icon size={16} />
        </button>
      ))}
    </div>
  );
}
