import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "REALTIME PHOTO",
  description: "Capture the moment. Share it instantly.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
