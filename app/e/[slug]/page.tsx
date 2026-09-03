"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Event = {
  id: string;
  name: string;
  slug: string;
};

type Photo = {
  id: string;
  storage_path: string;
  created_at: string;
};

export default function EventPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");

  useEffect(() => {
    const loadEvent = async () => {
      setLoading(true);
      setError("");

      // Get event
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("id, name, slug")
        .eq("slug", slug)
        .single();

      if (eventError || !eventData) {
        console.error("EVENT ERROR:", eventError);

        setError(
          eventError?.message || "Event could not be found."
        );

        setLoading(false);
        return;
      }

      setEvent(eventData);

      // Get photos
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
  }, [slug]);

  // Upload photos
  const handleUpload = async (
    inputEvent: ChangeEvent<HTMLInputElement>
  ) => {
    if (
      !inputEvent.target.files ||
      inputEvent.target.files.length === 0
    ) {
      return;
    }

    if (!event) {
      return;
    }

    setUploading(true);
    setError("");
    setUploadMessage("");

    const files = Array.from(inputEvent.target.files);

    try {
      for (const file of files) {
        // Only allow images
        if (!file.type.startsWith("image/")) {
          throw new Error(
            `${file.name} is not an image file.`
          );
        }

        // Maximum file size: 10MB
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(
            `${file.name} is larger than 10MB.`
          );
        }

        const fileExtension = file.name.split(".").pop();

        const fileName = `${crypto.randomUUID()}.${fileExtension}`;

        const filePath = `${event.id}/${fileName}`;

        // Upload image to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from("photos")
          .upload(filePath, file);

        if (uploadError) {
          throw uploadError;
        }

        // Save photo information in the database
        const { error: databaseError } = await supabase
          .from("photos")
          .insert({
            event_id: event.id,
            storage_path: filePath,
          });

        if (databaseError) {
          throw databaseError;
        }
      }

      setUploadMessage(
        `${files.length} ${
          files.length === 1 ? "photo" : "photos"
        } uploaded successfully!`
      );

      // Reload photos so the newly uploaded photos appear
      const { data: updatedPhotos } = await supabase
        .from("photos")
        .select("id, storage_path, created_at")
        .eq("event_id", event.id)
        .order("created_at", { ascending: false });

      setPhotos(updatedPhotos || []);
    } catch (uploadError) {
      console.error("UPLOAD ERROR:", uploadError);

      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Something went wrong while uploading."
      );
    } finally {
      setUploading(false);

      // Allow selecting the same file again
      inputEvent.target.value = "";
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-neutral-500">
          Loading event...
        </p>
      </main>
    );
  }

  if (!event) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">
            Event not found
          </h1>

          <p className="mt-3 text-neutral-500">
            {error || "This event could not be found."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-neutral-900">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-neutral-100 px-6 py-5 md:px-10">
        <p className="text-lg font-bold tracking-tight">
          REALTIME PHOTO
        </p>

        {/* Upload button */}
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
      </header>

      {/* Event information */}
      <section className="px-6 pb-8 pt-10 md:px-10">
        <div className="mb-3 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-green-500" />

          <span className="text-sm font-medium text-neutral-500">
            Live · {photos.length}{" "}
            {photos.length === 1 ? "photo" : "photos"}
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
          <p className="mt-4 text-sm font-medium text-red-600">
            {error}
          </p>
        )}
      </section>

      {/* Gallery */}
      <section className="px-6 pb-10 md:px-10">
        {photos.length === 0 ? (
          <div className="flex min-h-[50vh] items-center justify-center rounded-3xl bg-neutral-50">
            <div className="text-center">
              <p className="text-lg font-semibold">
                No photos yet
              </p>

              <p className="mt-2 text-sm text-neutral-500">
                Be the first to share a moment.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {photos.map((photo) => {
              const { data } = supabase.storage
                .from("photos")
                .getPublicUrl(photo.storage_path);

              return (
                <img
                  key={photo.id}
                  src={data.publicUrl}
                  alt="Event photo"
                  className="aspect-square w-full rounded-2xl object-cover"
                />
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}