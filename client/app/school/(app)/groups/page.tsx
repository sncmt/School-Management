import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequirePermission } from "@/components/auth/Can";
import { GroupsList } from "@/components/school/groups/GroupsList";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("school.groups");
  return { title: t("title") };
}

export default function GroupsPage() {
  return (
    <RequirePermission permission="group:view">
      <GroupsList />
    </RequirePermission>
  );
}
