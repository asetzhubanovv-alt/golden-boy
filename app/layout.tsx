import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { FavoritesProvider } from "@/components/providers/favorites-provider";
import { LanguageProvider } from "@/components/providers/language-provider";
import RouteScrollToTop from "@/components/route-scroll-to-top";
import { ItemNotificationsProvider } from "@/lib/use-item-notifications";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Amanat — жоғалған және табылған заттар",
  description:
    "Университет қауымдастығындағы жоғалған және табылған заттар туралы хабарландырулар.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="ru"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LanguageProvider>
          <ItemNotificationsProvider>
            <FavoritesProvider>
              <Suspense fallback={null}>
                <RouteScrollToTop />
              </Suspense>
              {children}
            </FavoritesProvider>
          </ItemNotificationsProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
