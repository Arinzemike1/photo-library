import Image from "next/image";
import Link from "next/link";
import { Camera } from "lucide-react";

const photos = [
  {
    id: "1",
    src: "/images/wedding.jpg",
    alt: "A wedding ceremony beneath a floral arch",
    name: "Alex",
    time: "2 min ago",
    featured: true,
  },
  {
    id: "2",
    src: "/images/couple.jpg",
    alt: "A couple sharing their first dance",
    name: "Sam",
    time: "8 min ago",
    featured: true,
  },
];
export default function Home() {
  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <header className="flex items-center justify-between px-6 py-5 md:px-12">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900">
            <Camera className="h-5 w-5 text-white" />
          </div>
          <span className="text-md font-bold tracking-wide text-neutral-900 sm:text-base">
            Realtime Photo
          </span>
        </div>
      </header>

      <section className="flex min-h-[calc(100vh-88px)] flex-col items-center justify-center px-6 text-center">
        <div className="max-w-3xl">
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">
            Live photo sharing
          </p>

          <h1 className="text-5xl font-bold leading-tight tracking-tight sm:text-6xl md:text-7xl">
            Capture the moment.
            <br />
            <span className="text-neutral-400">Share it instantly.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-neutral-500 sm:text-lg">
            Create a live photo gallery for your event. Everyone can upload,
            everyone can see. No accounts. No waiting.
          </p>
        </div>

        <div className="relative mx-auto mt-4 w-full max-w-lg">
          <div className="grid grid-cols-2 gap-3">
            <Image
              src={photos[0].src}
              alt={photos[0].alt}
              width={700}
              height={850}
              className="mt-10 aspect-[.82] w-full rounded-2xl object-cover"
            />
            <Image
              src={photos[1].src}
              alt={photos[1].alt}
              width={700}
              height={850}
              className="aspect-[.82] w-full rounded-2xl object-cover"
            />
          </div>
          <div className="absolute bottom-10 sm:bottom-2 left-1/2 flex -translate-x-1/2 items-center rounded-xl">
            <div className="mt-10">
              <Link
                href="/create"
                className="rounded-full bg-neutral-900 px-4 py-2 sm:px-8 sm:py-4 text-xs sm:text-sm font-semibold text-white transition hover:bg-neutral-700"
              >
                Create an Event
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
