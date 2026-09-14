"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getRelativeTime } from "@/lib/utils";

interface Photo {
  id: string;
  storage_path: string;
  created_at: string;
}

interface LightboxProps {
  photos: Photo[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  getFullImageUrl: (storagePath: string) => string;
}

export function Lightbox({
  photos,
  currentIndex,
  isOpen,
  onClose,
  getFullImageUrl,
}: LightboxProps) {
  const [activeIndex, setActiveIndex] = useState(currentIndex);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(
    null,
  );

  // Preload next 2 images
  useEffect(() => {
    if (!isOpen) return;

    const preloadImage = (url: string) => {
      const img = new Image();
      img.src = url;
    };

    // Preload next image
    if (activeIndex < photos.length - 1) {
      preloadImage(getFullImageUrl(photos[activeIndex + 1].storage_path));
    }
    // Preload image after next
    if (activeIndex < photos.length - 2) {
      preloadImage(getFullImageUrl(photos[activeIndex + 2].storage_path));
    }
  }, [activeIndex, isOpen, photos, getFullImageUrl]);

  // Navigation functions
  const goToNext = useCallback(() => {
    setActiveIndex((prev) => Math.min(prev + 1, photos.length - 1));
  }, [photos.length]);

  const goToPrev = useCallback(() => {
    setActiveIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  // Touch handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;

    const touchEnd = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY,
    };

    const diffX = touchStart.x - touchEnd.x;
    const diffY = touchStart.y - touchEnd.y;

    // Only handle horizontal swipes (ignore vertical scrolling)
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
      if (diffX > 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }

    setTouchStart(null);
  };

  if (!isOpen || photos.length === 0) return null;

  const currentPhoto = photos[activeIndex];
  const imageUrl = getFullImageUrl(currentPhoto.storage_path);
  const relativeTime = getRelativeTime(currentPhoto.created_at);

  return (
    <div className="fixed inset-0 z-50 bg-black/95" onClick={onClose}>
      {/* Background click area (closes lightbox) */}
      <div className="absolute inset-0" />

      {/* Top info bar */}
      <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-center gap-4 bg-linear-to-b from-black/60 to-transparent px-6 py-4 pt-6">
        <p className="text-sm font-medium text-white">
          Photo {activeIndex + 1} of {photos.length}
        </p>
        <span className="text-white/40">·</span>
        <p className="text-sm text-white/60">{relativeTime}</p>
      </div>

      {/* Image container */}
      <div
        className="relative flex h-full w-full items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={imageUrl}
          alt={`Photo ${activeIndex + 1} of ${photos.length}`}
          className="max-h-full max-w-full object-contain"
        />
      </div>

      {/* Desktop arrow buttons - minimal style */}
      {activeIndex > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            goToPrev();
          }}
          className="absolute left-4 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition hover:bg-white/20 md:block"
          aria-label="Previous photo"
        >
          <ChevronLeft size={32} strokeWidth={1.5} />
        </button>
      )}

      {activeIndex < photos.length - 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            goToNext();
          }}
          className="absolute right-4 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition hover:bg-white/20 md:block"
          aria-label="Next photo"
        >
          <ChevronRight size={32} strokeWidth={1.5} />
        </button>
      )}

      {/* Mobile swipe hint */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center text-xs text-white/40 md:hidden">
        Swipe to navigate
      </div>
    </div>
  );
}
