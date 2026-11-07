"use client";

import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import type { ListExport } from "@/lib/export/listExport";
import { downloadXlsx } from "@/lib/export/xlsx";
import { cn } from "@/lib/utils";

/*
 * Export a list: as an Excel file, or as PDF through the browser's print dialog ("Save as PDF").
 * PDF goes through printing because the browser lays out Bangla text correctly; PDF libraries
 * in the browser break its joined letters. `load` fetches every row under the current filters.
 */
export function ExportMenu({ load, className }: { load: () => Promise<ListExport>; className?: string }) {
  const t = useTranslations("export");
  const describeError = useErrorMessage();
  const [busy, setBusy] = useState<"excel" | "pdf" | null>(null);
  const [printing, setPrinting] = useState<ListExport | null>(null);

  const run = async (kind: "excel" | "pdf") => {
    setBusy(kind);
    try {
      const list = await load();
      if (kind === "excel") await downloadXlsx(list);
      else setPrinting(list);
    } catch (error) {
      toast.error(t("failed"), { description: describeError(error) });
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={busy !== null} className={cn("h-9 px-4 shadow-sm", className)}>
            <Download /> {busy ? t("preparing") : t("button")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => run("excel")}>
            <FileSpreadsheet /> {t("excel")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => run("pdf")}>
            <FileText /> {t("pdf")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {printing && <PrintList list={printing} onDone={() => setPrinting(null)} />}
    </>
  );
}

/* The list as printed pages (only it prints), the print dialog opened once the fonts are in. */
function PrintList({ list, onDone }: { list: ListExport; onDone: () => void }) {
  const t = useTranslations("export");

  useEffect(() => {
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      onDone();
    };
    window.addEventListener("afterprint", done);
    // the page title becomes the PDF's suggested file name
    const title = document.title;
    document.title = list.fileName;
    let frame = 0;
    void document.fonts.ready.then(() => {
      frame = requestAnimationFrame(() => {
        window.print();
        // browsers that don't fire afterprint: print() returns once the dialog is closed
        setTimeout(done, 500);
      });
    });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("afterprint", done);
      document.title = title;
    };
  }, [list, onDone]);

  return createPortal(
    <div className="print-area print-landscape hidden text-black print:block">
      <div className="mb-3 border-b border-neutral-400 pb-2">
        <div className="text-base font-bold">{list.school}</div>
        <div className="text-sm font-semibold">{list.title}</div>
        {list.subtitle && <div className="text-xs text-neutral-600">{list.subtitle}</div>}
      </div>
      <table className="w-full border-collapse text-[10px] leading-snug">
        <thead>
          <tr>
            <th className="border border-neutral-400 bg-neutral-200 px-1.5 py-1 text-left font-semibold">#</th>
            {list.columns.map((c, i) => (
              <th key={i} className={cn("border border-neutral-400 bg-neutral-200 px-1.5 py-1 font-semibold", c.align === "right" ? "text-right" : "text-left")}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {list.rows.map((row, r) => (
            <tr key={r} className="break-inside-avoid">
              <td className="border border-neutral-300 px-1.5 py-0.5 tabular-nums">{r + 1}</td>
              {list.columns.map((c, i) => (
                <td key={i} className={cn("border border-neutral-300 px-1.5 py-0.5", c.align === "right" && "text-right tabular-nums")}>
                  {row[i] ?? ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {list.rows.length === 0 && <p className="mt-2 text-xs">{t("empty")}</p>}
    </div>,
    document.body,
  );
}
