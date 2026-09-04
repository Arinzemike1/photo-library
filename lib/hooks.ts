"use client";

import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { supabase } from "./supabase";

const PHOTOS_PER_PAGE = 20;

export type Photo = {
  id: string;
  storage_path: string;
  created_at: string;
};

export type Event = {
  id: string;
  name: string;
  slug: string;
};

// Fetch event by slug
export function useEvent(slug: string) {
  return useQuery({
    queryKey: ["event", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, name, slug")
        .eq("slug", slug)
        .single();

      if (error) throw error;
      return data as Event;
    },
  });
}

// Fetch photos with infinite scroll
export function usePhotos(eventId: string | undefined) {
  return useInfiniteQuery({
    queryKey: ["photos", eventId],
    queryFn: async ({ pageParam = 0 }) => {
      if (!eventId) return { photos: [], nextPage: null };

      const from = pageParam * PHOTOS_PER_PAGE;
      const to = from + PHOTOS_PER_PAGE - 1;

      const { data, error } = await supabase
        .from("photos")
        .select("id, storage_path, created_at")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      const photos = data || [];
      const hasMore = photos.length === PHOTOS_PER_PAGE;

      return {
        photos: photos as Photo[],
        nextPage: hasMore ? pageParam + 1 : null,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
    enabled: !!eventId,
  });
}

// Get public URL for a photo
export function getPhotoUrl(storagePath: string) {
  const { data } = supabase.storage.from("photos").getPublicUrl(storagePath);
  return data.publicUrl;
}

// Hook to refresh photos query
export function useRefreshPhotos() {
  const queryClient = useQueryClient();

  return {
    refresh: (eventId: string) => {
      queryClient.invalidateQueries({ queryKey: ["photos", eventId] });
    },
    addPhoto: (eventId: string, photo: Photo) => {
      queryClient.setQueryData(
        ["photos", eventId],
        (oldData: { pages: { photos: Photo[]; nextPage: number | null }[] } | undefined) => {
          if (!oldData) return oldData;

          // Add new photo to the first page
          const newPages = [...oldData.pages];
          if (newPages.length > 0) {
            newPages[0] = {
              ...newPages[0],
              photos: [photo, ...newPages[0].photos],
            };
          }

          return {
            ...oldData,
            pages: newPages,
          };
        }
      );
    },
  };
}

// Hook to get total photo count
export async function getPhotoCount(eventId: string): Promise<number> {
  const { count, error } = await supabase
    .from("photos")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId);

  if (error) throw error;
  return count || 0;
}
