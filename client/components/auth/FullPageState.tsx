import type { ReactNode } from "react";
import { SchoolLoader } from "@/components/layout/SchoolLoader";

type Props = {
  loading?: boolean;
  title?: string;
  message?: string;
  actions?: ReactNode;
};

/** Centered loader or message, used while a session loads or when it can't. */
export function FullPageState({ loading, title, message, actions }: Props) {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-canvas p-6">
      {loading ? (
        <SchoolLoader />
      ) : (
        <div className="max-w-sm space-y-3 text-center">
          {title && <h1 className="text-lg font-semibold">{title}</h1>}
          {message && <p className="text-sm text-muted-foreground">{message}</p>}
          {actions && <div className="flex justify-center gap-2 pt-2">{actions}</div>}
        </div>
      )}
    </div>
  );
}
