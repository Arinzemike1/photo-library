"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import QRCodeLib from "qrcode";
interface QRCodeProps {
  url: string;
  size?: number;
  className?: string;
}

export function QRCode({ url, size = 200, className = "" }: QRCodeProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    QRCodeLib.toDataURL(url, {
      width: size,
      margin: 2,
      color: {
        dark: "#171717",
        light: "#FFFFFF",
      },
    })
      .then((dataUrl) => setQrDataUrl(dataUrl))
      .catch((err) => console.error("QR Code generation error:", err));
  }, [url, size]);

  if (!qrDataUrl) {
    return (
      <div
        className={`animate-pulse rounded-xl bg-neutral-200 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <Image
      src={qrDataUrl}
      alt="QR Code"
      className={`rounded-xl ${className}`}
      width={size}
      height={size}
    />
  );
}
