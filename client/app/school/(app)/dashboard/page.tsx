"use client";

import { Can } from "@/components/auth/Can";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSchoolMe } from "@/lib/auth/hooks";

// Demo of permission-based UI: each card shows only with its permission.
const areas = [
  { title: "Students", permission: "student:view" },
  { title: "Teachers", permission: "teacher:view" },
  { title: "Sections", permission: "section:view" },
  { title: "Subjects", permission: "subject:view" },
  { title: "Exams", permission: "exam:view" },
  { title: "Routine", permission: "routine:view" },
];

export default function SchoolDashboardPage() {
  const me = useSchoolMe();
  if (!me) return null;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Welcome, {me.user.fullname}</h1>
        <div className="flex flex-wrap gap-2">
          {me.roles.map((role) => (
            <Badge key={role.id} variant="secondary">{role.name}</Badge>
          ))}
          <span className="text-sm text-muted-foreground">
            {me.permissions.length} permissions · {me.modules.length} modules
          </span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {areas.map((area) => (
          <Can key={area.permission} permission={area.permission}>
            <Card>
              <CardHeader>
                <CardTitle>{area.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Visible with <code>{area.permission}</code>
              </CardContent>
            </Card>
          </Can>
        ))}
      </div>
    </div>
  );
}
