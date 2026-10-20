"use client";

import {
  ArrowLeft,
  Ban,
  ExternalLink,
  KeyRound,
  MoreHorizontal,
  Pause,
  Pencil,
  Power,
  RotateCcw,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { schoolActions, type SchoolDetail } from "@/lib/platform/schools";
import { schoolSiteUrl } from "@/lib/tenant";
import { ActivateSchoolDialog } from "./ActivateSchoolDialog";
import { ResetSuperAdminPasswordDialog } from "./ResetSuperAdminPasswordDialog";
import { SchoolBrandingCard } from "./SchoolBrandingCard";
import { SchoolStatusBadge } from "./SchoolStatusBadge";
import { SchoolStatusDialog, type StatusAction } from "./SchoolStatusDialog";

export function SchoolDetailView({ school }: { school: SchoolDetail }) {
  const t = useTranslations("platform.schoolDetail");
  const tLanguage = useTranslations("languages");
  const format = useFormatter();
  const actions = schoolActions(school);

  const [activating, setActivating] = useState(false);
  const [statusAction, setStatusAction] = useState<StatusAction | null>(null);
  const [resetting, setResetting] = useState(false);

  const date = (value: string | null) =>
    value ? format.dateTime(new Date(value), { dateStyle: "medium" }) : null;
  const siteUrl = schoolSiteUrl(school.subdomain);
  const notSet = <span className="text-muted-foreground">{t("notSet")}</span>;

  const hasStatusActions = actions.reactivate || actions.suspend || actions.deactivate;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/schools">
          <ArrowLeft /> {t("back")}
        </Link>
      </Button>

      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{school.nameEn}</h1>
            <SchoolStatusBadge status={school.status} />
          </div>
          {school.nameBn && <p className="text-muted-foreground">{school.nameBn}</p>}
        </div>

        <div className="flex gap-2">
          {actions.activate && (
            <Button onClick={() => setActivating(true)}>
              <Power /> {t("actions.activate")}
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href={`/schools/${school.id}/edit`}>
              <Pencil /> {t("edit")}
            </Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label={t("moreActions")}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              {actions.openSite && (
                <DropdownMenuItem asChild>
                  <a href={siteUrl} target="_blank" rel="noreferrer">
                    <ExternalLink /> {t("actions.openSite")}
                  </a>
                </DropdownMenuItem>
              )}
              {actions.resetPassword && (
                <DropdownMenuItem onSelect={() => setResetting(true)}>
                  <KeyRound /> {t("actions.resetPassword")}
                </DropdownMenuItem>
              )}
              {hasStatusActions && (actions.openSite || actions.resetPassword) && <DropdownMenuSeparator />}
              {actions.reactivate && (
                <DropdownMenuItem onSelect={() => setStatusAction("reactivate")}>
                  <RotateCcw /> {t("actions.reactivate")}
                </DropdownMenuItem>
              )}
              {actions.suspend && (
                <DropdownMenuItem variant="destructive" onSelect={() => setStatusAction("suspend")}>
                  <Pause /> {t("actions.suspend")}
                </DropdownMenuItem>
              )}
              {actions.deactivate && (
                <DropdownMenuItem variant="destructive" onSelect={() => setStatusAction("deactivate")}>
                  <Ban /> {t("actions.deactivate")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <InfoCard title={t("sections.overview")}>
          <Field label={t("fields.code")}>
            <span className="font-mono">{school.schoolCode}</span>
          </Field>
          <Field label={t("fields.site")}>
            {actions.openSite ? (
              <a href={siteUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">
                {siteUrl.replace(/^https?:\/\//, "")}
                <ExternalLink className="size-3" />
              </a>
            ) : (
              siteUrl.replace(/^https?:\/\//, "")
            )}
          </Field>
          <Field label={t("fields.language")}>{tLanguage(school.language)}</Field>
          <Field label={t("fields.created")}>{date(school.createdAt)}</Field>
          <Field label={t("fields.activated")}>
            {date(school.activationDate) ?? <span className="text-muted-foreground">{t("notActivated")}</span>}
          </Field>
        </InfoCard>

        <InfoCard title={t("sections.contact")}>
          <Field label={t("fields.email")}>{school.email}</Field>
          <Field label={t("fields.phone")}>{school.phone ?? notSet}</Field>
          <Field label={t("fields.website")}>
            {school.website ? (
              <a href={school.website} target="_blank" rel="noreferrer" className="hover:underline">
                {school.website}
              </a>
            ) : (
              notSet
            )}
          </Field>
          <Field label={t("fields.address")}>
            {school.address ? <span className="whitespace-pre-line">{school.address}</span> : notSet}
          </Field>
        </InfoCard>

        <InfoCard title={t("sections.superAdmin")}>
          {school.superAdmin ? (
            <>
              <Field label={t("fields.name")}>{school.superAdmin.fullname}</Field>
              <Field label={t("fields.email")}>{school.superAdmin.email}</Field>
              <Field label={t("fields.account")}>
                {!school.superAdmin.isActive ? (
                  <Badge variant="destructive">{t("superAdminState.disabled")}</Badge>
                ) : (
                  <Badge>{t("superAdminState.active")}</Badge>
                )}
              </Field>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t("noSuperAdmin")}</p>
          )}
        </InfoCard>

        <SchoolBrandingCard school={school} />

        <InfoCard title={t("sections.billing")}>
          <Field label={t("fields.monthlyFee")}>
            {school.monthlyFee != null
              ? format.number(Number(school.monthlyFee), { style: "currency", currency: "BDT" })
              : notSet}
          </Field>
          <Field label={t("fields.discount")}>
            {format.number(Number(school.discount) / 100, { style: "percent", maximumFractionDigits: 2 })}
          </Field>
        </InfoCard>

        <InfoCard title={t("sections.usage")}>
          <p>{t("stats.students", { count: school.stats.activeStudents })}</p>
          <p>{t("stats.teachers", { count: school.stats.activeTeachers })}</p>
        </InfoCard>

        <InfoCard title={t("sections.modules")}>
          {school.modules.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noModules")}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {school.modules.map((module) => (
                <Badge key={module.code} variant={module.type === "PAID" ? "default" : "secondary"}>
                  {module.name}
                  <span className="opacity-70">· {t(`moduleTypes.${module.type}`)}</span>
                </Badge>
              ))}
            </div>
          )}
        </InfoCard>
      </div>

      <ActivateSchoolDialog school={activating ? school : null} onClose={() => setActivating(false)} />
      <SchoolStatusDialog school={school} action={statusAction} onClose={() => setStatusAction(null)} />
      <ResetSuperAdminPasswordDialog school={school} open={resetting} onClose={() => setResetting(false)} />
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">{children}</CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words">{children}</span>
    </div>
  );
}
