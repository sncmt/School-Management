import type { Metadata } from "next";
import { Geist_Mono, Hind_Siliguri, Tinos } from "next/font/google";
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

// Bangla is in SolaimanLipi (globals.css); this is the last resort when it can't be had,
// fetched only then
const bangla = Hind_Siliguri({
  variable: "--font-bangla",
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
  preload: false,
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
