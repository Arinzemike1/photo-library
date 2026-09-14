"use client";

import { useGalleryStore } from "@/lib/store";
import { ArrowUp } from "lucide-react";

interface NewPhotosIndicatorProps {
  onClick: () => void;
}

export function NewPhotosIndicator({ onClick }: NewPhotosIndicatorProps) {
  const { newPhotosCount, clearNewPhotos } = useGalleryStore();

  if (newPhotosCount === 0) return null;

  const handleClick = () => {
    clearNewPhotos();
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      className="fixed left-1/2 top-24 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-neutral-900 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-neutral-700 hover:shadow-xl"
    >
      <ArrowUp size={16} />
      {newPhotosCount} new {newPhotosCount === 1 ? "photo" : "photos"}
    </button>
  );
}
