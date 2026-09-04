import { create } from "zustand";
import { persist } from "zustand/middleware";

export type GalleryLayout = "comfortable" | "compact";

interface GalleryState {
  layout: GalleryLayout;
  newPhotosCount: number;
  hasDismissedPrompt: boolean;
  setLayout: (layout: GalleryLayout) => void;
  incrementNewPhotos: () => void;
  clearNewPhotos: () => void;
  dismissPrompt: () => void;
  resetPrompt: () => void;
}

export const useGalleryStore = create<GalleryState>()(
  persist(
    (set) => ({
      layout: "comfortable",
      newPhotosCount: 0,
      hasDismissedPrompt: false,
      setLayout: (layout) => set({ layout }),
      incrementNewPhotos: () =>
        set((state) => ({ newPhotosCount: state.newPhotosCount + 1 })),
      clearNewPhotos: () => set({ newPhotosCount: 0 }),
      dismissPrompt: () => set({ hasDismissedPrompt: true }),
      resetPrompt: () => set({ hasDismissedPrompt: false }),
    }),
    {
      name: "gallery-storage",
      partialize: (state) => ({
        layout: state.layout,
        hasDismissedPrompt: state.hasDismissedPrompt,
      }),
    }
  )
);

interface UploadState {
  isUploading: boolean;
  uploadProgress: number;
  totalFiles: number;
  completedFiles: number;
  setUploading: (uploading: boolean) => void;
  setProgress: (completed: number, total: number) => void;
  resetUpload: () => void;
}

export const useUploadStore = create<UploadState>((set) => ({
  isUploading: false,
  uploadProgress: 0,
  totalFiles: 0,
  completedFiles: 0,
  setUploading: (isUploading) => set({ isUploading }),
  setProgress: (completed, total) =>
    set({
      completedFiles: completed,
      totalFiles: total,
      uploadProgress: Math.round((completed / total) * 100),
    }),
  resetUpload: () =>
    set({
      isUploading: false,
      uploadProgress: 0,
      totalFiles: 0,
      completedFiles: 0,
    }),
}));

interface ShareModalState {
  isOpen: boolean;
  eventUrl: string;
  eventName: string;
  openModal: (url: string, name: string) => void;
  closeModal: () => void;
}

export const useShareModalStore = create<ShareModalState>((set) => ({
  isOpen: false,
  eventUrl: "",
  eventName: "",
  openModal: (url, name) => set({ isOpen: true, eventUrl: url, eventName: name }),
  closeModal: () => set({ isOpen: false }),
}));
