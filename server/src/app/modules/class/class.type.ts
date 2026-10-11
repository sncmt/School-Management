import type { z } from "zod";
import { ClassValidation } from "./class.validation";

export type CreateClassPayload = z.infer<typeof ClassValidation.createClass>;
export type UpdateClassPayload = z.infer<typeof ClassValidation.updateClass>;
export type ClassQuery = z.infer<typeof ClassValidation.classQuery>;
