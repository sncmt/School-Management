"use client";

import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toAsciiDigits } from "@/lib/i18n/digits";

/* "500", "৫০০", "12.50": a money amount, or NaN. */
export const parseMoney = (text: string) => {
  const v = toAsciiDigits(text.trim());
  return /^\d+(\.\d{1,2})?$/.test(v) ? Number(v) : NaN;
};

/** A label, the control, and an optional hint under it (for the small finance dialogs). */
export function Field({ label, htmlFor, required, children, hint }: { label: string; htmlFor?: string; required?: boolean; children: ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} required={required}>
        {label}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** An amount in taka, with the ৳ sign inside the box. */
export function TakaInput({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative w-40">
      <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">৳</span>
      <Input id={id} inputMode="decimal" className="pl-7" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
