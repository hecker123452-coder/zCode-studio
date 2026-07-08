import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SecurityGuard } from "@/components/security/security-guard";
import { ServiceWorkerRegister } from "@/components/pwa/sw-register";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ZCode Studio - Web-Based Code Editor",
  description: "A powerful web-based code editor inspired by Acode, built with Next.js & Monaco Editor. Features AI assistant, integrated terminal, and more.",
  keywords: ["code editor", "Monaco", "Next.js", "Acode", "web IDE", "online coding"],
  authors: [{ name: "ZCode Studio" }],
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ZCode Studio",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#1e1e1e",
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning data-ui-theme="dark" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
        style={{ overscrollBehavior: 'none', touchAction: 'manipulation' }}
      >
        <SecurityGuard />
        <ServiceWorkerRegister />
        {children}
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
