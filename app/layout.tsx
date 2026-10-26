import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import "./globals.css";

export const metadata: Metadata = {
  title: "Administration | Ngaoundéré FC",
  description: "Administration du site officiel du Ngaoundéré FC.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#008751",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
