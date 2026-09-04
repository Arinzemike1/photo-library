"use client";

import { useUploadStore } from "@/lib/store";
import { Loader2, Check } from "lucide-react";

export function UploadProgress() {
  const { isUploading, uploadProgress, completedFiles, totalFiles } =
    useUploadStore();

  if (!isUploading) return null;

  const isComplete = completedFiles === totalFiles && totalFiles > 0;

  return (
    <div className="fixed bottom-6 right-6 z-50 rounded-2xl border border-neutral-200 bg-white p-4 shadow-lg">
      <div className="flex items-center gap-3">
        {isComplete ? (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
            <Check size={20} className="text-green-600" />
          </div>
        ) : (
          <div className="flex h-10 w-10 items-center justify-center">
            <Loader2 size={24} className="animate-spin text-neutral-600" />
          </div>
        )}

        <div>
          <p className="text-sm font-medium">
            {isComplete
              ? "Upload complete!"
              : `Uploading ${completedFiles + 1} of ${totalFiles}`}
          </p>
          {!isComplete && (
            <div className="mt-2 h-1.5 w-32 overflow-hidden rounded-full bg-neutral-200">
              <div
                className="h-full rounded-full bg-neutral-900 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
