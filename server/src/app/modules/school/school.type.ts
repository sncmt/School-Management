import type { z } from "zod";

import {
  SchoolValidation,
} from "./school.validation";

export type CreateSchoolPayload = {
  nameEn: string;
  nameBn: string;
  subdomain: string;
  email: string;
  publicEmail?: string;
  phone?: string;
  website?: string;
  address?: string;
  monthlyFee?: string;
  yearlyFee?: string;
  discount: number;
  language?: "EN" | "BN";
  subscriptionPlan?: "MONTHLY" | "YEARLY";
  logo?: string;
  favicon?: string;
};

type ActivateSchoolParams = {
  id: string;
};


export type GetAllSchoolsQuery =
  z.infer<
    typeof SchoolValidation.getAllSchoolsQuerySchema
  >;

export type UpdateSchoolPayload = z.infer<typeof SchoolValidation.updateSchoolSchema>;

export type ChangeableSchoolStatus = z.infer<typeof SchoolValidation.changeSchoolStatusSchema>["status"];