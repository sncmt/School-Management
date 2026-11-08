import { Download, GraduationCap, QrCode, ShieldCheck, Smartphone } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import QRCode from "qrcode";
import { APP_DOWNLOAD_PATH } from "@/lib/marketing/appRelease";
import { marketingSiteUrl } from "@/lib/tenant";

/*
 * The mobile app's download page (sncmt.com/app): until the app is on Google Play, it is
 * installed from the APK published as a GitHub release (lib/marketing/appRelease.ts). The
 * button and the QR code use our own short link, which always leads to the newest one; the
 * app itself offers later updates.
 */

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.app");
  return { title: t("metaTitle"), description: t("subtitle") };
}

export default async function AppDownloadPage() {
  const t = await getTranslations("marketing.app");
  // drawn here, on our own server: no outside QR service sees the link
  const qr = await QRCode.toString(marketingSiteUrl(APP_DOWNLOAD_PATH), { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#0b1020", light: "#ffffff" } });

  const steps = [
    { icon: Download, title: t("step1Title"), body: t("step1Body") },
    { icon: ShieldCheck, title: t("step2Title"), body: t("step2Body") },
    { icon: Smartphone, title: t("step3Title"), body: t("step3Body") },
  ];

  return (
    <>
      <section className="dark relative isolate overflow-hidden bg-mk-ink text-white">
        <div aria-hidden className="mk-grid absolute inset-0 -z-10" />
        <div aria-hidden className="absolute -top-40 left-1/2 -z-10 h-[30rem] w-[50rem] -translate-x-1/2 rounded-full bg-mk-blue/25 blur-[120px]" />

        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:py-24 lg:grid-cols-[1.2fr_1fr]">
          <div className="text-center lg:text-left">
            <div className="animate-in fade-in slide-in-from-bottom-2 mx-auto inline-flex size-20 items-center justify-center rounded-3xl bg-[#285cc2] shadow-[0_20px_60px_-20px_#285cc2] duration-700 lg:mx-0">
              <GraduationCap className="size-11 text-white" strokeWidth={2.2} />
            </div>
            <h1 className="animate-in fade-in slide-in-from-bottom-4 mt-8 text-4xl leading-tight font-extrabold tracking-tight duration-700 sm:text-5xl">
              {t("title")}
            </h1>
            <p className="animate-in fade-in slide-in-from-bottom-4 mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/70 duration-1000 sm:text-lg lg:mx-0">
              {t("subtitle")}
            </p>
            <div className="animate-in fade-in slide-in-from-bottom-4 mt-9 flex flex-col items-center gap-3 duration-1000 sm:flex-row sm:justify-center lg:justify-start">
              <a
                href={APP_DOWNLOAD_PATH}
                className="group inline-flex h-13 w-full items-center justify-center gap-2.5 rounded-full bg-mk-gold px-8 text-base font-semibold text-mk-ink shadow-[0_10px_40px_-10px_var(--mk-gold)] transition-all hover:bg-white sm:w-auto"
              >
                <Download className="size-5 transition-transform group-hover:translate-y-0.5" />
                {t("download")}
              </a>
              <span className="text-sm text-white/55">{t("requirement")}</span>
            </div>
          </div>

          {/* for a visitor on a computer: scan with the phone instead */}
          <div className="animate-in fade-in zoom-in-95 mx-auto w-full max-w-xs duration-1000">
            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 text-center backdrop-blur">
              <div className="rounded-2xl bg-white p-4" dangerouslySetInnerHTML={{ __html: qr }} />
              <p className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-white/80">
                <QrCode className="size-4" />
                {t("scan")}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">{t("howTitle")}</h2>
        <ol className="mt-10 grid gap-5 sm:grid-cols-3">
          {steps.map((step, i) => (
            <li key={step.title} className="rounded-3xl border bg-card p-6">
              <div className="flex items-center gap-3">
                <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <step.icon className="size-5" />
                </span>
                <span className="text-sm font-semibold text-muted-foreground">{t("stepLabel", { n: i + 1 })}</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
        <p className="mx-auto mt-8 max-w-2xl text-center text-sm leading-relaxed text-muted-foreground">{t("playProtect")}</p>
      </section>
    </>
  );
}
