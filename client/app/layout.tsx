import type { Metadata } from "next";
import { Geist_Mono, Tinos } from "next/font/google";
import localFont from "next/font/local";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import "./globals.css";

import { BanglaDigits } from "@/components/i18n/BanglaDigits";
import QueryProviders from "@/providers/QueryProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

// English is in Times New Roman, the visitor's own copy (Windows and Mac have it; it may not be
// served from here without a licence). Tinos is a free font of the same shape for devices
// without it (Android, Linux): downloaded only there, so not preloaded.
const tinos = Tinos({
  variable: "--font-tinos",
  subsets: ["latin"],
  weight: ["400", "700"],
  preload: false,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Bangla: Anek Bangla (free, from Google Fonts; its Bangla letters are kept in app/fonts), so it
// can be drawn a little smaller than it comes: its letters run large beside Times New Roman.
// Fetched only when a page has Bangla, so English pages skip it.
const bangla = localFont({
  src: "./fonts/AnekBangla-bengali.woff2",
  variable: "--font-bangla",
  weight: "100 800",
  display: "swap",
  preload: false,
  // its own letters only: no stand-in font while it loads (none has Bangla anyway)
  adjustFontFallback: false,
  declarations: [
    { prop: "size-adjust", value: "88%" },
    { prop: "unicode-range", value: "U+0951-0952, U+0964-0965, U+0980-09FE, U+200C-200D, U+25CC" },
  ],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("common");
  return { title: { default: t("appName"), template: `%s · ${t("appName")}` } };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${tinos.variable} ${geistMono.variable} ${bangla.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>
          {/* Bangla digits everywhere on screen when the language is Bangla */}
          <BanglaDigits />
          <ThemeProvider>
            <QueryProviders>
              <TooltipProvider>{children}</TooltipProvider>
              <Toaster position="top-right" richColors closeButton />
            </QueryProviders>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
