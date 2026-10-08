"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { getErrorMessage } from "@/lib/api/errors";

/**
 * `describe(error)`: the server's message, or a translated fallback for
 * network and unknown errors. (Server messages are English until they carry codes.)
 */
export const useErrorMessage = () => {
  const t = useTranslations("errors");
  return useCallback(
    (error: unknown) => getErrorMessage(error, { generic: t("generic"), network: t("network") }),
    [t],
  );
};
