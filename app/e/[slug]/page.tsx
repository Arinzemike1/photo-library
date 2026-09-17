"use client";

import { ChangeEvent, useEffect, useState } from "react";
import imageCompression from "browser-image-compression";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Lightbox } from "@/app/components/lightbox";
import { LayoutSwitcher } from "@/app/components/layout-switcher";
import { UploadProgress } from "@/app/components/upload-progress";
import { getRelativeTime } from "@/lib/utils";
import { useGalleryStore, useUploadStore } from "@/lib/store";
import { Camera, Loader2, Plus } from "lucide-react";

export default function EventPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [event, setEvent] = useState<{
    id: string;
    name: string;
    slug: string;
  } | null>(null);
  const [photos, setPhotos] = useState<
    { id: string; storage_path: string; created_at: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const layout = useGalleryStore((state) => state.layout);
  const setLayout = useGalleryStore((state) => state.setLayout);
  const setUploadProgress = useUploadStore((state) => state.setProgress);
  const setUploadStatus = useUploadStore((state) => state.setUploading);
  const resetUpload = useUploadStore((state) => state.resetUpload);

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Load event and photos
  useEffect(() => {
    let cancelled = false;
    let subscription: ReturnType<typeof supabase.channel> | undefined;

    const loadEvent = async () => {
      setLoading(true);
      setError("");

      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("id, name, slug")
        .eq("slug", slug)
        .single();

      if (eventError || !eventData) {
        if (cancelled) return;
        setError(eventError?.message || "Event could not be found.");
        setLoading(false);
        return;
      }

      if (cancelled) return;
      setEvent(eventData);

      const { data: photoData, error: photoError } = await supabase
        .from("photos")
        .select("id, storage_path, created_at")
        .eq("event_id", eventData.id)
        .order("created_at", { ascending: false });

      if (photoError) {
        console.error("PHOTO ERROR:", photoError);
      }

      if (cancelled) return;
      setPhotos(photoData || []);
      setLoading(false);

      // Subscribe only to inserts for this event.
      subscription = supabase
        .channel(`photos-${eventData.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "photos",
            filter: `event_id=eq.${eventData.id}`,
          },
          (payload) => {
            const newPhoto = payload.new as {
              id: string;
              storage_path: string;
              created_at: string;
            };
            setPhotos((current) => [newPhoto, ...current]);
          },
        )
        .subscribe();
    };

    loadEvent();

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, [slug]);

  // Helper function to get thumbnail URL (300px width, 80% quality)
  const getThumbnailUrl = (storagePath: string): string => {
    const { data } = supabase.storage.from("photos").getPublicUrl(storagePath);
    return `${data.publicUrl}?width=300&quality=80`;
  };

  // Helper function to get full image URL
  const getFullImageUrl = (storagePath: string): string => {
    const { data } = supabase.storage.from("photos").getPublicUrl(storagePath);
    return data.publicUrl;
  };

  // Open lightbox at specific index
  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  // Close lightbox
  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const compressImage = async (file: File): Promise<File> => {
    try {
      const isHeif = /image\/hei[cf]|\.hei[cf]$/i.test(
        `${file.type} ${file.name}`,
      );
      let sourceFile = file;

      if (isHeif) {
        const { default: heic2any } = await import("heic2any");
        const converted = await heic2any({
          blob: file,
          toType: "image/jpeg",
          quality: 0.85,
        });
        const convertedBlob = Array.isArray(converted)
          ? converted[0]
          : converted;
        sourceFile = new File([convertedBlob], `${file.name}.jpg`, {
          type: "image/jpeg",
        });
      }

      return await imageCompression(sourceFile, {
        fileType: "image/jpeg",
        maxSizeMB: 2,
        maxWidthOrHeight: 2400,
        useWebWorker: true,
      });
    } catch {
      throw new Error(
        `${file.name} could not be processed on this device. Try exporting it as JPG or PNG and upload it again.`,
      );
    }
  };

  // Upload photos
  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    if (!event) return;

    setUploading(true);
    setError("");

    const files = Array.from(e.target.files);
    setUploadProgress(0, files.length);
    setUploadStatus(true);

    try {
      for (const [index, file] of files.entries()) {
        if (!file.type.startsWith("image/")) {
          throw new Error(`${file.name} is not an image file.`);
        }

        const compressedFile = await compressImage(file);

        const fileExt = compressedFile.type.split("/").pop() || "jpg";
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `${event.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("photos")
          .upload(filePath, compressedFile, {
            contentType: compressedFile.type,
          });

        if (uploadError) throw uploadError;

        const { error: dbError } = await supabase.from("photos").insert({
          event_id: event.id,
          storage_path: filePath,
        });

        if (dbError) throw dbError;

        setUploadProgress(index + 1, files.length);
      }

      window.setTimeout(resetUpload, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      resetUpload();
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-neutral-900" />
          <p className="text-sm font-medium text-neutral-500">
            Loading event...
          </p>
        </div>
      </main>
    );
  }

  if (!event) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Event not found</h1>
          <p className="mt-3 text-neutral-500">{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main
      className={`${
        photos.length === 0
          ? "flex h-screen flex-col overflow-hidden"
          : "min-h-screen"
      } bg-white text-neutral-900`}
    >
      <UploadProgress />

      {/* Lightbox */}
      {lightboxOpen && (
        <Lightbox
          photos={photos}
          currentIndex={lightboxIndex}
          isOpen={lightboxOpen}
          onClose={closeLightbox}
          getFullImageUrl={getFullImageUrl}
        />
      )}

      {/* Header */}
      <header className="flex min-w-0 items-center justify-between gap-3 border-b border-neutral-100 px-4 py-4 sm:px-6 md:px-10">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900">
            <Camera className="h-4 w-4 text-white" />
          </div>
          <span className="truncate text-sm font-bold tracking-tight text-neutral-900 sm:text-base">
            Realtime Photo
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <LayoutSwitcher layout={layout} setLayout={setLayout} />

          <label
            title={uploading ? "Uploading photos" : "Upload photos"}
            aria-label={uploading ? "Uploading photos" : "Upload photos"}
             className={`hidden sm:flex shrink-0 cursor-pointer items-center justify-center gap-2 touch-manipulation rounded-full bg-neutral-900 text-sm font-semibold text-white transition hover:bg-neutral-700 sm:px-5 sm:py-3 ${
            uploading ? "cursor-not-allowed opacity-50" : ""
            }`}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>{uploading ? "Uploading..." : "Upload Photos"}</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>
      </header>

      {/* Event info */}
      <section className="px-6 pb-8 pt-10 md:px-10">
        <div className="mb-3 flex items-center justify-between w-full">
    {/* Live Counter */}
    <div className="flex items-center gap-2">
      <span className="h-2 w-2 rounded-full bg-green-500" />
      <span className="text-sm font-medium text-neutral-500">
        Live · {photos.length} {photos.length === 1 ? "photo" : "photos"}
      </span>
    </div>

    {/* Mobile Only Upload Button (Plus + Text) */}
    <label
      className={`flex sm:hidden cursor-pointer items-center justify-center gap-1.5 touch-manipulation rounded-full bg-neutral-900 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-neutral-700 active:scale-95 ${
        uploading ? "cursor-not-allowed opacity-50" : ""
      }`}
    >
      {uploading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      <span>{uploading ? "Uploading..." : "Upload"}</span>
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={handleUpload}
        disabled={uploading}
        className="hidden"
      />
    </label>
  </div>

        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          {event.name}
        </h1>

        {error && (
          <p className="mt-4 text-sm font-medium text-red-600">{error}</p>
        )}
      </section>

      {/* Gallery */}
      <section
        className={`px-6 pb-10 md:px-10 ${
          photos.length === 0 ? "flex min-h-0 flex-1 flex-col" : ""
        }`}
      >
        {photos.length === 0 ? (
          <div className="flex min-h-0 flex-1 items-center justify-center rounded-3xl bg-neutral-50">
            <div className="text-center">
              <p className="text-lg font-semibold">No photos yet</p>
              <p className="mt-2 text-sm text-neutral-500">
                Be the first to share a moment.
              </p>
              <label
                className={`mt-5 inline-flex cursor-pointer items-center gap-2 rounded-full bg-neutral-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-700 ${
                  uploading ? "cursor-not-allowed opacity-50" : ""
                }`}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                {uploading ? "Uploading..." : "Upload Photos"}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        ) : (
          <div
            className={`grid gap-3 ${
              layout === "comfortable"
                ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
                : "grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
            }`}
          >
            {photos.map((photo, index) => {
              const thumbnailUrl = getThumbnailUrl(photo.storage_path);
              const relativeTime = getRelativeTime(photo.created_at);

              return (
                <button
                  type="button"
                  key={photo.id}
                  aria-label={`Open photo ${index + 1}`}
                  className="group relative block aspect-square w-full cursor-pointer overflow-hidden rounded-2xl bg-neutral-100 text-left"
                  onClick={() => openLightbox(index)}
                >
                  <img
                    src={thumbnailUrl}
                    alt={`Photo ${index + 1}`}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  {/* Timestamp overlay */}
                  <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <p className="text-xs font-medium text-white">
                      {relativeTime}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
