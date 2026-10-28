import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { AppProviders } from "@/components/providers/AppProviders";
import { PwaInstallModal } from "@/components/PwaInstallModal";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "NFC Manager — Administration Ngaoundéré FC",
    template: "%s | NFC Manager",
  },
  description:
    "Interface d’administration du Ngaoundéré Football Club : matchs en direct, effectif, actualités, médiathèque, classement et inscriptions.",
  manifest: "/manifest.webmanifest",
  applicationName: "NFC Manager",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "NFC Manager",
  },
  icons: {
    icon: [
      { url: "/logo.png", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: [{ url: "/logo.png", type: "image/png" }],
    apple: [{ url: "/logo.png", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#131618" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="antialiased">
        <AppProviders>
          {children}
          <ServiceWorkerRegistration />
          <PwaInstallModal />
        </AppProviders>
      </body>
    </html>
  );
}
