"use client";

import { Pencil, Plus } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getFieldErrors } from "@/lib/api/errors";
import { toAsciiDigits } from "@/lib/i18n/digits";
import { useTaka } from "@/lib/i18n/useCurrency";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useCreatePackage, usePackages, useUpdatePackage, type SubscriptionPackage } from "@/lib/platform/packages";
import { cn } from "@/lib/utils";

/** The subscription packages: a student limit and a price a month (a year is twelve months). */
export function PackagesPage() {
  const t = useTranslations("platform.packages");
  const format = useFormatter();
  const taka = useTaka();
  const describeError = useErrorMessage();
  const packages = usePackages();
  const [editing, setEditing] = useState<SubscriptionPackage | "new" | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">{t("title")}</h1>
          <p className="page-subtitle">{t("description")}</p>
        </div>
        <Button onClick={() => setEditing("new")}>
          <Plus /> {t("add")}
        </Button>
      </div>

      {packages.isPending ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : packages.isError ? (
        <p className="text-sm text-muted-foreground">{describeError(packages.error)}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">{t("columns.name")}</TableHead>
                <TableHead>{t("columns.students")}</TableHead>
                <TableHead className="text-right">{t("columns.monthly")}</TableHead>
                <TableHead className="text-right">{t("columns.yearly")}</TableHead>
                <TableHead className="text-right">{t("columns.schools")}</TableHead>
                <TableHead className="w-12 pr-5" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {packages.data.map((p) => (
                <TableRow key={p.id} className={cn(!p.isActive && "text-muted-foreground")}>
                  <TableCell className="py-3 pl-5">
                    <div className="flex items-center gap-2 font-medium">
                      {p.name}
                      {!p.isActive && <Badge variant="outline">{t("off")}</Badge>}
                    </div>
                    <div className="font-mono text-xs text-muted-foreground">{p.code}</div>
                  </TableCell>
                  <TableCell>{p.maxStudents === null ? t("unlimited") : t("upTo", { count: p.maxStudents })}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{taka(Number(p.monthlyPrice))}</TableCell>
                  <TableCell className="text-right tabular-nums">{taka(Number(p.yearlyPrice))}</TableCell>
                  <TableCell className="text-right tabular-nums">{format.number(p.schools)}</TableCell>
                  <TableCell className="pr-5">
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => setEditing(p)} aria-label={t("edit")}>
                      <Pencil />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">{t("note")}</p>

      <PackageDialog value={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

const parseMoney = (text: string) => {
  const v = toAsciiDigits(text.trim());
  return /^\d+(\.\d{1,2})?$/.test(v) ? Number(v) : NaN;
};

function PackageDialog({ value, onClose }: { value: SubscriptionPackage | "new" | null; onClose: () => void }) {
  const t = useTranslations("platform.packages");
  return (
    <Dialog open={value !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{value === "new" ? t("addTitle") : t("editTitle", { name: value?.name ?? "" })}</DialogTitle>
          <DialogDescription>{t("dialogHint")}</DialogDescription>
        </DialogHeader>
        {value !== null && <PackageForm key={value === "new" ? "new" : value.id} pkg={value === "new" ? null : value} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function PackageForm({ pkg, onDone }: { pkg: SubscriptionPackage | null; onDone: () => void }) {
  const t = useTranslations("platform.packages");
  const taka = useTaka();
  const describeError = useErrorMessage();
  const create = useCreatePackage();
  const update = useUpdatePackage();
  const [code, setCode] = useState("");
  const [name, setName] = useState(pkg?.name ?? "");
  const [unlimited, setUnlimited] = useState(pkg ? pkg.maxStudents === null : false);
  const [maxStudents, setMaxStudents] = useState(pkg?.maxStudents != null ? String(pkg.maxStudents) : "");
  const [price, setPrice] = useState(pkg ? String(Number(pkg.monthlyPrice)) : "");
  const [isActive, setIsActive] = useState(pkg?.isActive ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const saving = create.isPending || update.isPending;
  const monthly = parseMoney(price);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found: Record<string, string> = {};
    if (!pkg && !/^[A-Za-z][A-Za-z0-9_]{1,29}$/.test(code.trim())) found.code = t("codeInvalid");
    if (name.trim().length < 2) found.name = t("nameRequired");
    const limit = Number(toAsciiDigits(maxStudents.trim()));
    if (!unlimited && !(Number.isInteger(limit) && limit >= 1)) found.maxStudents = t("limitInvalid");
    if (Number.isNaN(monthly)) found.monthlyPrice = t("priceInvalid");
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const body = { name: name.trim(), maxStudents: unlimited ? null : limit, monthlyPrice: monthly };
    try {
      if (pkg) await update.mutateAsync({ id: pkg.id, body: { ...body, isActive } });
      else await create.mutateAsync({ ...body, code: code.trim().toUpperCase() });
      toast.success(pkg ? t("saved", { name: body.name }) : t("added", { name: body.name }));
      onDone();
    } catch (error) {
      const fields = getFieldErrors(error);
      if (Object.keys(fields).length > 0) setErrors(fields);
      else setErrors({ form: describeError(error) });
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {errors.form && <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{errors.form}</p>}
      {!pkg && (
        <div className="space-y-1.5">
          <Label htmlFor="pkg-code" required>
            {t("code")}
          </Label>
          <Input id="pkg-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={30} className="font-mono" placeholder="GOLD" autoFocus />
          {errors.code ? <p className="text-xs text-destructive">{errors.code}</p> : <p className="text-xs text-muted-foreground">{t("codeHint")}</p>}
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="pkg-name" required>
          {t("name")}
        </Label>
        <Input id="pkg-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoFocus={!!pkg} />
        {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pkg-max">{t("maxStudents")}</Label>
        <div className="flex items-center gap-3">
          <Input id="pkg-max" inputMode="numeric" value={unlimited ? "" : maxStudents} onChange={(e) => setMaxStudents(e.target.value)} disabled={unlimited} className="w-32" />
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={unlimited} onCheckedChange={setUnlimited} /> {t("unlimited")}
          </label>
        </div>
        {errors.maxStudents && <p className="text-xs text-destructive">{errors.maxStudents}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pkg-price" required>
          {t("monthlyPrice")}
        </Label>
        <div className="relative w-40">
          <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">৳</span>
          <Input id="pkg-price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className="pl-7" />
        </div>
        {errors.monthlyPrice ? (
          <p className="text-xs text-destructive">{errors.monthlyPrice}</p>
        ) : (
          !Number.isNaN(monthly) && <p className="text-xs text-muted-foreground">{t("yearlyIs", { amount: taka(monthly * 12) })}</p>
        )}
      </div>
      {pkg && (
        <label className="flex items-start justify-between gap-4 rounded-md border p-3 text-sm">
          <span>
            <span className="font-medium">{t("active")}</span>
            <span className="block text-xs text-muted-foreground">{t("activeHint")}</span>
          </span>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </label>
      )}
      {pkg && pkg.schools > 0 && <p className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">{t("changeNote", { count: pkg.schools })}</p>}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={saving}>
          {t("cancel")}
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? t("saving") : pkg ? t("save") : t("addButton")}
        </Button>
      </DialogFooter>
    </form>
  );
}
