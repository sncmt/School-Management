import { z } from "zod";

export const ID_CARD_TEMPLATES = ["CLASSIC", "MODERN", "MINIMAL", "BOLD"] as const;

/*
 * The ID card design. Every field has a default, so a school that never saved one (or
 * saved it before a field existed) still gets a complete design. Texts left out fall
 * back to the school's language in the service.
 */
export const idCardSettingsSchema = z.object({
  // CLASSIC and MINIMAL are landscape, MODERN and BOLD portrait
  template: z.enum(ID_CARD_TEMPLATES).default("CLASSIC"),
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Choose a colour")
    .default("#1e3a8a"),
  showLogo: z.boolean().default(true),
  showAdmissionNo: z.boolean().default(false),
  // the back: the school's contacts, this text and the signature line
  showBack: z.boolean().default(true),
  backText: z.string().trim().max(300).optional(),
  signatureLabel: z.string().trim().max(40).optional(),
});

export type IdCardSettings = z.output<typeof idCardSettingsSchema>;

const cardsQuery = z.object({
  // left out: the current year
  academicYearId: z.string().trim().min(1).optional(),
  classId: z.string().trim().min(1).optional(),
  sectionId: z.string().trim().min(1).optional(),
  enrollmentId: z.string().trim().min(1).optional(),
});

export const IdCardValidation = { saveSettings: idCardSettingsSchema.strict(), cardsQuery };

export type IdCardsQuery = z.infer<typeof cardsQuery>;
