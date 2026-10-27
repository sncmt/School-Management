import { useMutation } from "@tanstack/react-query";
import { httpClient } from "@/lib/api/httpClient";
import type { ContactInput } from "@/zod/contact";

/** The marketing site's contact form: emailed to the platform. */
export const useSendContact = () =>
  useMutation({
    mutationFn: async (input: ContactInput) => {
      await httpClient.post("/contact", input);
    },
  });
