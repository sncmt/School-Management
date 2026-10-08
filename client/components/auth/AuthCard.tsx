import type { ReactNode } from "react";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Centered card layout shared by the login and change-password pages. */
export function AuthCard({
  title,
  description,
  logo,
  children,
  footer,
}: {
  title: ReactNode;
  description?: ReactNode;
  logo?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-1 items-center justify-center bg-muted/40 p-4">
      <LanguageSwitcher className="absolute right-4 top-4 bg-background" />
      <div className="w-full max-w-sm space-y-4">
        <Card>
          <CardHeader>
            {logo}
            <CardTitle className="text-xl">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
        {footer && <div className="text-center text-sm text-muted-foreground">{footer}</div>}
      </div>
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      {message}
    </p>
  );
}
