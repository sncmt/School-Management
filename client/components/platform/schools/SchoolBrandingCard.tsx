"use client";

import { useTranslations } from "next-intl";
import { ImageUpload } from "@/components/data/ImageUpload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useRemoveSchoolBranding,
  useSetSchoolBranding,
  type BrandingImage,
  type SchoolDetail,
} from "@/lib/platform/schools";

/** The school's logo and favicon, each with upload and remove. */
export function SchoolBrandingCard({ school }: { school: SchoolDetail }) {
  const t = useTranslations("platform.schoolDetail");
  const setImage = useSetSchoolBranding();
  const removeImage = useRemoveSchoolBranding();
  const messages = { saved: t("branding.saved"), removed: t("branding.removed") };

  const item = (kind: BrandingImage, size: number) => (
    <div className="space-y-2">
      <div>
        <p className="font-medium">{t(`branding.${kind}`)}</p>
        <p className="text-xs text-muted-foreground">{t(`branding.${kind}Hint`)}</p>
      </div>
      <ImageUpload
        imageUrl={school[kind]}
        size={size}
        alt={t(`branding.${kind}`)}
        messages={messages}
        onUpload={(file, onProgress) => setImage.mutateAsync({ schoolId: school.id, kind, file, onProgress })}
        onRemove={() => removeImage.mutateAsync({ schoolId: school.id, kind })}
      />
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("sections.branding")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 text-sm">
        {item("logo", 96)}
        {item("favicon", 48)}
      </CardContent>
    </Card>
  );
}
