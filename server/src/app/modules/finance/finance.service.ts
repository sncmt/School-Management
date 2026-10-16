import { prisma } from "../../../../lib/prisma";
import type { FinanceSettingsPayload } from "./finance.validation";

/* The school's finance rules, the defaults where nothing was saved. */
const getSettings = async (schoolId: string) => {
  const row = await prisma.financeSetting.findUnique({
    where: { schoolId },
    select: { midYearMonthlyFees: true, updatedAt: true },
  });
  return { midYearMonthlyFees: row?.midYearMonthlyFees ?? "FROM_ADMISSION", updatedAt: row?.updatedAt ?? null };
};

/* Saving changes only fees assigned from now on; fees already assigned stay as they are. */
const saveSettings = async (schoolId: string, userId: string, data: FinanceSettingsPayload) => {
  await prisma.financeSetting.upsert({
    where: { schoolId },
    create: { schoolId, ...data, updatedBy: userId },
    update: { ...data, updatedBy: userId },
  });
  return getSettings(schoolId);
};

export const FinanceService = { getSettings, saveSettings };
