"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function CreateEventPage() {
  const router = useRouter();

  const [eventName, setEventName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  const createEvent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!eventName.trim()) {
      setError("Please enter an event name.");
      return;
    }

    setError("");
    setIsCreating(true);

    const slug = `${eventName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")}-${Date.now()}`;

    const { data, error: supabaseError } = await supabase
      .from("events")
      .insert({
        name: eventName.trim(),
        slug,
      })
      .select()
      .single();

    if (supabaseError) {
      setError(supabaseError.message);
      setIsCreating(false);
      return;
    }

    router.push(`/e/${data.slug}`);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 text-neutral-900">
      <div className="w-full max-w-lg">
        <button
          onClick={() => router.back()}
          className="mb-12 text-sm text-neutral-500 transition hover:text-neutral-900"
        >
          ← Back
        </button>

        <div className="mb-10">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">
            Create your gallery
          </p>

          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Create an event
          </h1>

          <p className="mt-4 leading-7 text-neutral-500">
            Give your event a name. You&apos;ll get a shareable link and QR
            code for your guests.
          </p>
        </div>

        <form onSubmit={createEvent}>
          <label
            htmlFor="eventName"
            className="mb-2 block text-sm font-medium"
          >
            Event name
          </label>

          <input
            id="eventName"
            type="text"
            value={eventName}
            onChange={(event) => setEventName(event.target.value)}
            placeholder="David & Sarah's Wedding"
            maxLength={100}
            className="w-full rounded-xl border border-neutral-200 px-4 py-4 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900"
          />

          {error && (
            <p className="mt-3 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isCreating}
            className="mt-6 w-full rounded-full bg-neutral-900 px-8 py-4 text-sm font-semibold text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCreating ? "Creating..." : "Create Event"}
          </button>
        </form>
      </div>
    </main>
  );
}