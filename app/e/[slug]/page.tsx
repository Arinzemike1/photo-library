"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Lightbox } from "@/app/components/lightbox";
import { LayoutSwitcher } from "@/app/components/layout-switcher";
import { UploadProgress } from "@/app/components/upload-progress";
import { getRelativeTime } from "@/lib/utils";
import { useGalleryStore, useUploadStore } from "@/lib/store";

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
  const [uploadMessage, setUploadMessage] = useState("");
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
    const loadEvent = async () => {
      setLoading(true);
      setError("");

      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("id, name, slug")
        .eq("slug", slug)
        .single();

      if (eventError || !eventData) {
        setError(eventError?.message || "Event could not be found.");
        setLoading(false);
        return;
      }

      setEvent(eventData);

      const { data: photoData, error: photoError } = await supabase
        .from("photos")
        .select("id, storage_path, created_at")
        .eq("event_id", eventData.id)
        .order("created_at", { ascending: false });

      if (photoError) {
        console.error("PHOTO ERROR:", photoError);
      }

      setPhotos(photoData || []);
      setLoading(false);
    };

    loadEvent();

    // Subscribe to realtime updates
    const subscription = supabase
      .channel(`photos-${slug}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "photos",
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

    return () => {
      subscription.unsubscribe();
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

  // Upload photos
  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    if (!event) return;

    setUploading(true);
    setError("");
    setUploadMessage("");

    const files = Array.from(e.target.files);
    setUploadProgress(0, files.length);
    setUploadStatus(true);

    try {
      for (const [index, file] of files.entries()) {
        if (!file.type.startsWith("image/")) {
          throw new Error(`${file.name} is not an image file.`);
        }

        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`${file.name} is larger than 10MB.`);
        }

        const fileExt = file.name.split(".").pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `${event.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("photos")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { error: dbError } = await supabase.from("photos").insert({
          event_id: event.id,
          storage_path: filePath,
        });

        if (dbError) throw dbError;

        setUploadProgress(index + 1, files.length);
      }

      setUploadMessage(
        `${files.length} ${files.length === 1 ? "photo" : "photos"} uploaded successfully!`,
      );
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
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-neutral-500">Loading event...</p>
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
    <main className="min-h-screen bg-white text-neutral-900">
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
      <header className="flex items-center justify-between border-b border-neutral-100 px-6 py-5 md:px-10">
        <p className="text-lg font-bold tracking-tight">REALTIME PHOTO</p>

        <div className="flex items-center gap-3">
          <LayoutSwitcher layout={layout} setLayout={setLayout} />

          <label
            className={`cursor-pointer rounded-full bg-neutral-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-700 ${
              uploading ? "cursor-not-allowed opacity-50" : ""
            }`}
          >
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
      </header>

      {/* Event info */}
      <section className="px-6 pb-8 pt-10 md:px-10">
        <div className="mb-3 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-sm font-medium text-neutral-500">
            Live · {photos.length} {photos.length === 1 ? "photo" : "photos"}
          </span>
        </div>

        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          {event.name}
        </h1>

        {uploadMessage && (
          <p className="mt-4 text-sm font-medium text-green-600">
            {uploadMessage}
          </p>
        )}

        {error && (
          <p className="mt-4 text-sm font-medium text-red-600">{error}</p>
        )}
      </section>

      {/* Gallery */}
      <section className="px-6 pb-10 md:px-10">
        {photos.length === 0 ? (
          <div className="flex min-h-[50vh] items-center justify-center rounded-3xl bg-neutral-50">
            <div className="text-center">
              <p className="text-lg font-semibold">No photos yet</p>
              <p className="mt-2 text-sm text-neutral-500">
                Be the first to share a moment.
              </p>
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
                <div
                  key={photo.id}
                  className="group relative cursor-pointer overflow-hidden rounded-2xl bg-neutral-100 aspect-square"
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
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
