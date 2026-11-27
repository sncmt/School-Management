"use client";

import { Globe, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCan } from "@/lib/auth/hooks";
import { publicSchoolRoutes } from "@/lib/auth/routes";
import { NoticeBoardView } from "./NoticeBoardView";
import { NoticeFormDialog } from "./NoticeFormDialog";
import { NoticeManager } from "./NoticeManager";
import { PageHero } from "@/components/layout/PageHero";

/** The notice board for everyone; writing and publishing for those allowed. */
export function NoticesPage() {
  const t = useTranslations("school.notices");
  const can = useCan();
  const canView = can("notice:view");
  const canCreate = can("notice:create");
  const canPublish = can("notice:publish");
  const [tab, setTab] = useState("board");
  // the editor: null closed, "new", or a notice id
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <PageHero
        title={t("title")}
        description={t("description")}
        actions={
          <>
            <div className="flex flex-wrap items-center gap-2">
              {/* what visitors see on the school's website */}
              <Button asChild variant="outline">
                <a href={publicSchoolRoutes.notices} target="_blank" rel="noopener noreferrer">
                  <Globe /> {t("publicPage")}
                </a>
              </Button>
              {/* someone who may write but not see the list still gets the button */}
              {canCreate && !canView && (
                <Button onClick={() => setEditing("new")}>
                  <Plus /> {t("manage.write")}
                </Button>
              )}
            </div>
          </>
        }
      />

      {canView ? (
        <Tabs value={tab} onValueChange={setTab} className="gap-2">
          <TabsList variant="strip">
            <TabsTrigger value="board">{t("tabs.board")}</TabsTrigger>
            <TabsTrigger value="manage">{t("tabs.manage")}</TabsTrigger>
          </TabsList>
          <TabsContent value="board">
            <NoticeBoardView />
          </TabsContent>
          <TabsContent value="manage">
            <NoticeManager canCreate={canCreate} canPublish={canPublish} onWrite={() => setEditing("new")} onEdit={setEditing} />
          </TabsContent>
        </Tabs>
      ) : (
        <NoticeBoardView />
      )}

      <NoticeFormDialog
        open={editing !== null}
        noticeId={editing === "new" ? null : editing}
        canPublish={canPublish}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}
