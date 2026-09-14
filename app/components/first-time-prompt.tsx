"use client";

import { useGalleryStore } from "@/lib/store";
import { Camera, X } from "lucide-react";

interface FirstTimePromptProps {
  onUpload: () => void;
}

export function FirstTimePrompt({ onUpload }: FirstTimePromptProps) {
  const { hasDismissedPrompt, dismissPrompt } = useGalleryStore();

  if (hasDismissedPrompt) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
        <button
          onClick={dismissPrompt}
          className="absolute right-4 top-4 rounded-full p-2 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-600"
        >
          <X size={20} />
        </button>

        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
          <Camera size={28} className="text-neutral-700" />
        </div>

        <h2 className="mb-3 text-2xl font-bold">Share your moments</h2>
        <p className="mb-8 text-neutral-500">
          Do you have photos from the event you&apos;d like to share?
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              dismissPrompt();
              onUpload();
            }}
            className="rounded-full bg-neutral-900 px-6 py-4 text-sm font-semibold text-white transition hover:bg-neutral-700"
          >
            Upload Photos
          </button>
          <button
            onClick={dismissPrompt}
            className="rounded-full px-6 py-4 text-sm font-semibold text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-700"
          >
            Continue Viewing
          </button>
        </div>
      </div>
    </div>
  );
}
