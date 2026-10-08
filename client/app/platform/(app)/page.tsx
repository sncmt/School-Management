"use client";

import { useMe } from "@/lib/auth/hooks";

export default function PlatformDashboardPage() {
  const { data: me } = useMe();

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">Welcome, {me?.user.fullname}</h1>
      <p className="text-muted-foreground">Platform dashboard. Schools, NCTB subjects and national holidays will live here.</p>
    </div>
  );
}
