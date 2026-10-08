"use client";

import { useTranslations } from "next-intl";
import { Can } from "@/components/auth/Can";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSchoolMe } from "@/lib/auth/hooks";
import type messages from "@/messages/en.json";

type RoleKey = keyof (typeof messages)["roles"];

// Demo of permission-based UI: each card shows only with its permission.
const areas = [
  { key: "students", permission: "student:view" },
  { key: "teachers", permission: "teacher:view" },
  { key: "sections", permission: "section:view" },
  { key: "subjects", permission: "subject:view" },
  { key: "exams", permission: "exam:view" },
  { key: "routine", permission: "routine:view" },
] as const;

export default function SchoolDashboardPage() {
  const t = useTranslations("school");
  const tRoles = useTranslations("roles");
  const me = useSchoolMe();
  if (!me) return null;

  // system roles are translated; a school's own custom roles show as named
  const roleName = (name: string) =>
    tRoles.has(name as RoleKey) ? tRoles(name as RoleKey) : name;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">{t("welcome", { name: me.user.fullname })}</h1>
        <div className="flex flex-wrap items-center gap-2">
          {me.roles.map((role) => (
            <Badge key={role.id} variant="secondary">
              {roleName(role.name)}
            </Badge>
          ))}
          <span className="text-sm text-muted-foreground">
            {t("accessSummary", { permissions: me.permissions.length, modules: me.modules.length })}
          </span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {areas.map((area) => (
          <Can key={area.permission} permission={area.permission}>
            <Card>
              <CardHeader>
                <CardTitle>{t(`areas.${area.key}`)}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {t("visibleWith", { code: area.permission })}
              </CardContent>
            </Card>
          </Can>
        ))}
      </div>
    </div>
  );
}
