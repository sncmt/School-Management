import type { z } from "zod";
import { AcademicYearValidation } from "./academicYear.validation";

export type CreateAcademicYearPayload = z.infer<typeof AcademicYearValidation.createAcademicYear>;
export type UpdateAcademicYearPayload = z.infer<typeof AcademicYearValidation.updateAcademicYear>;
