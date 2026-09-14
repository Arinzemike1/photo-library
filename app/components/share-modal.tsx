"use client";

import { useShareModalStore } from "@/lib/store";
import { QRCode } from "./qr-code";
import { Copy, Download, X } from "lucide-react";
import { useState, useEffect } from "react";
import QRCodeLib from "qrcode";

export function ShareModal() {
  const { isOpen, eventUrl, eventName, closeModal } = useShareModalStore();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  if (!isOpen) return null;

  const fullUrl = eventUrl.startsWith("http")
    ? eventUrl
    : `${typeof window !== "undefined" ? window.location.origin : ""}${eventUrl}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleDownloadQR = async () => {
    try {
      const dataUrl = await QRCodeLib.toDataURL(fullUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: "#171717",
          light: "#FFFFFF",
        },
      });

      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${eventName.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-qr-code.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to download QR:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <button
          onClick={closeModal}
          className="absolute right-4 top-4 rounded-full p-2 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-600"
        >
          <X size={20} />
        </button>

        <h2 className="mb-2 text-2xl font-bold">{eventName}</h2>
        <p className="mb-6 text-sm text-neutral-500">
          Share this event with your guests
        </p>

        {/* QR Code */}
        <div className="mb-6 flex flex-col items-center">
          <div className="rounded-2xl border border-neutral-200 bg-white p-4">
            <QRCode url={fullUrl} size={180} />
          </div>
          <p className="mt-3 text-xs text-neutral-500">
            Scan to see and share photos
          </p>
        </div>

        {/* Event Link */}
        <div className="mb-4">
          <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-neutral-500">
            Event link
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={fullUrl}
              readOnly
              className="flex-1 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600 outline-none"
            />
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-700"
            >
              <Copy size={16} />
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        {/* Share Buttons */}
          <button
            onClick={handleDownloadQR}
            className="flex items-center w-full justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
          >
            <Download size={18} />
            Download QR
          </button>

        <p className="mt-4 text-center text-xs text-neutral-400">
          Print the QR code and place it around the venue
        </p>
      </div>
    </div>
  );
}
