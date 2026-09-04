"use client";

import { useEffect, useRef, useCallback, ChangeEvent } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { useInView } from "react-intersection-observer";
import { supabase } from "@/lib/supabase";
import {
  useEvent,
  usePhotos,
  getPhotoUrl,
  useRefreshPhotos,
} from "@/lib/hooks";
import {
  useGalleryStore,
  useUploadStore,
  useShareModalStore,
  GalleryLayout,
} from "@/lib/store";
import { QRCode } from "@/app/components/qr-code";
import { ShareModal } from "@/app/components/share-modal";
import { FirstTimePrompt } from "@/app/components/first-time-prompt";
import { LayoutSwitcher } from "@/app/components/layout-switcher";
import { NewPhotosIndicator } from "@/app/components/new-photos-indicator";
import { UploadProgress } from "@/app/components/upload-progress";
import { Share2, Upload } from "lucide-react";

export default function EventPage() {
  const params = useParams();
  const slug = params.slug as string;

  const {
    layout,
    incrementNewPhotos,
    clearNewPhotos,
  } = useGalleryStore();
  const {
    setUploading,
    setProgress,
    resetUpload,
  } = useUploadStore();
  const { openModal } = useShareModalStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const hasScrolled = useRef(false);

  const { data: event, isLoading: eventLoading, error: eventError } = useEvent(slug);
  const {
    data: photosData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: photosLoading,
  } = usePhotos(event?.id);

  const { refresh, addPhoto } = useRefreshPhotos();

  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allPhotos = photosData?.pages.flatMap((page) => page.photos) || [];

  useEffect(() => {
    const handleScroll = () => {
      hasScrolled.current = window.scrollY > 100;
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!event?.id) return;

    const subscription = supabase
      .channel(`photos-${event.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "photos",
          filter: `event_id=eq.${event.id}`,
        },
        (payload) => {
          const newPhoto = payload.new as {
            id: string;
            storage_path: string;
            created_at: string;
          };

          if (hasScrolled.current) {
            incrementNewPhotos();
          } else {
            addPhoto(event.id, newPhoto);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [event?.id, incrementNewPhotos, addPhoto]);

  const handleUpload = useCallback(
    async (inputEvent: ChangeEvent<HTMLInputElement>) => {
      if (!inputEvent.target.files || inputEvent.target.files.length === 0) {
        return;
      }

      if (!event) return;

      setUploading(true);
      const files = Array.from(inputEvent.target.files);
      setProgress(0, files.length);

      try {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];

          if (!file.type.startsWith("image/")) {
            console.error(`${file.name} is not an image file.`);
            continue;
          }

          if (file.size > 10 * 1024 * 1024) {
            console.error(`${file.name} is larger than 10MB.`);
            continue;
          }

          const fileExtension = file.name.split(".").pop();
          const fileName = `${crypto.randomUUID()}.${fileExtension}`;
          const filePath = `${event.id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from("photos")
            .upload(filePath, file);

          if (uploadError) {
            console.error("Upload error:", uploadError);
            continue;
          }
          const { error: dbError } = await supabase.from("photos").insert({
            event_id: event.id,
            storage_path: filePath,
          });

          if (dbError) {
            console.error("Database error:", dbError);
            continue;
          }

          setProgress(i + 1, files.length);
        }
        refresh(event.id);
      } catch (error) {
        console.error("Upload failed:", error);
      } finally {
        setTimeout(() => {
          resetUpload();
        }, 2000);
        inputEvent.target.value = "";
      }
    },
    [event, setUploading, setProgress, resetUpload, refresh]
  );

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const handleShare = () => {
    if (event) {
      const url = typeof window !== "undefined" ? window.location.href : "";
      openModal(url, event.name);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    clearNewPhotos();
  };

  if (eventLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-neutral-500">Loading event...</p>
      </main>
    );
  }

  if (eventError || !event) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Event not found</h1>
          <p className="mt-3 text-neutral-500">
            {eventError?.message || "This event could not be found."}
          </p>
        </div>
      </main>
    );
  }

  const eventUrl =
    typeof window !== "undefined" ? window.location.href : "";

  return (
    <main className="min-h-screen bg-white text-neutral-900">
      {/* First Time Prompt */}
      <FirstTimePrompt onUpload={triggerUpload} />

      {/* Share Modal */}
      <ShareModal />

      {/* New Photos Indicator */}
      <NewPhotosIndicator onClick={scrollToTop} />

      {/* Upload Progress */}
      <UploadProgress />

      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-neutral-100 bg-white/80 px-6 py-4 backdrop-blur-md md:px-10">
        <div className="flex items-center gap-4">
          <p className="text-lg font-bold tracking-tight">REALTIME PHOTO</p>
          <div className="hidden sm:block">
            <LayoutSwitcher />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleShare}
            className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
          >
            <Share2 size={16} />
            <span className="hidden sm:inline">Share</span>
          </button>

          <button
            onClick={triggerUpload}
            className="flex items-center gap-2 rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-700"
          >
            <Upload size={16} />
            Upload
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            className="hidden"
          />
        </div>
      </header>

      {/* Event Info */}
      <section className="px-6 pb-8 pt-8 md:px-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              <span className="text-sm font-medium text-neutral-500">
                Live · {allPhotos.length}+ photos
              </span>
            </div>

            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              {event.name}
            </h1>
          </div>

          {/* QR Code - visible on larger screens */}
          <div className="hidden items-center gap-4 md:flex">
            <div className="rounded-xl border border-neutral-200 bg-white p-3">
              <QRCode url={eventUrl} size={100} />
            </div>
            <div className="text-center">
              <p className="text-xs text-neutral-500">Scan to view</p>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile QR Code */}
      <section className="px-6 pb-6 md:hidden">
        <div className="flex items-center gap-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
          <QRCode url={eventUrl} size={80} />
          <div>
            <p className="font-medium">Scan to see photos</p>
            <p className="text-sm text-neutral-500">
              Share this QR code with guests
            </p>
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section ref={galleryRef} className="px-6 pb-10 md:px-10">
        {photosLoading ? (
          <div className="flex min-h-[50vh] items-center justify-center">
            <p className="text-neutral-500">Loading photos...</p>
          </div>
        ) : allPhotos.length === 0 ? (
          <div className="flex min-h-[50vh] items-center justify-center rounded-3xl bg-neutral-50">
            <div className="text-center">
              <p className="text-lg font-semibold">No photos yet</p>
              <p className="mt-2 text-sm text-neutral-500">
                Be the first to share a moment.
              </p>
              <button
                onClick={triggerUpload}
                className="mt-6 rounded-full bg-neutral-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-neutral-700"
              >
                Upload Photos
              </button>
            </div>
          </div>
        ) : (
          <GalleryGrid photos={allPhotos} layout={layout} />
        )}

        {/* Load More Trigger */}
        {hasNextPage && (
          <div
            ref={loadMoreRef}
            className="mt-8 flex justify-center py-8"
          >
            {isFetchingNextPage ? (
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
            ) : (
              <p className="text-sm text-neutral-400">Scroll for more</p>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

function GalleryGrid({
  photos,
  layout,
}: {
  photos: { id: string; storage_path: string; created_at: string }[];
  layout: GalleryLayout;
}) {
  
  const gridClasses = {
    comfortable: "grid-cols-1 sm:grid-cols-2 gap-4",
    compact: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3",
  };

  return (
    <div className={`grid ${gridClasses[layout]}`}>
      {photos.map((photo) => (
        <GalleryImage key={photo.id} photo={photo} layout={layout} />
      ))}
    </div>
  );
}

function GalleryImage({
  photo,
  layout,
}: {
  photo: { id: string; storage_path: string; created_at: string };
  layout: GalleryLayout;
}) {
  const imageUrl = getPhotoUrl(photo.storage_path);

  const aspectClasses = {
    comfortable: "aspect-[4/5]",
    compact: "aspect-square",
  };

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl bg-neutral-100 ${aspectClasses[layout]}`}
    >
      <Image
        src={imageUrl}
        alt="Event photo"
        fill
        className="object-cover transition duration-300 group-hover:scale-105"
        sizes={
          layout === "comfortable"
            ? "(max-width: 640px) 100vw, 50vw"
            : "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
        }
        unoptimized={imageUrl.includes("supabase")}
      />
    </div>
  );
}
