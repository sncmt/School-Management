import { randomBytes } from "crypto";
import httpStatus from "http-status";
import { prisma } from "../../../../lib/prisma";
import { AppError } from "../../errorHandler/AppError";
import { open, seal } from "../../shared/secretBox";
import type { SaveOnlineSettingsPayload } from "./onlinePayment.validation";
import { findByTranId, type Store } from "./sslcommerz";

/*
 * A school's online payment settings: its SSLCommerz store (the password kept encrypted and
 * never sent back), sandbox or live, and the convenience charge. Online payment can only be
 * switched on with a Store ID and password saved.
 */

const settingsOf = (schoolId: string) => prisma.onlinePaymentSetting.findUnique({ where: { schoolId } });

/* The settings as the school sees them: whether a password is saved, never the password. */
const getSettings = async (schoolId: string) => {
  const row = await settingsOf(schoolId);
  return {
    enabled: row?.enabled ?? false,
    sandbox: row?.sandbox ?? true,
    storeId: row?.storeId ?? null,
    hasPassword: !!row?.storePassword,
    chargePercent: row ? row.chargePercent.toFixed(2) : "0.00",
    lastTest: row?.lastTestAt ? { at: row.lastTestAt, ok: !!row.lastTestOk, message: row.lastTestMessage } : null,
  };
};

const saveSettings = async (schoolId: string, userId: string, data: SaveOnlineSettingsPayload) => {
  const row = await settingsOf(schoolId);
  const storePassword = data.storePassword === undefined ? row?.storePassword ?? null : data.storePassword ? seal(data.storePassword) : null;
  const storeId = data.storeId || null;
  if (data.enabled && (!storeId || !storePassword)) {
    throw new AppError("Save the SSLCommerz Store ID and password before switching online payment on", httpStatus.BAD_REQUEST);
  }
  // other credentials: the old test result no longer says anything
  const changedStore = storeId !== (row?.storeId ?? null) || data.storePassword !== undefined || data.sandbox !== (row?.sandbox ?? true);
  const values = {
    enabled: data.enabled,
    sandbox: data.sandbox,
    storeId,
    storePassword,
    chargePercent: data.chargePercent,
    updatedBy: userId,
    ...(changedStore ? { lastTestAt: null, lastTestOk: null, lastTestMessage: null } : {}),
  };
  await prisma.onlinePaymentSetting.upsert({ where: { schoolId }, create: { schoolId, ...values }, update: values });
  return getSettings(schoolId);
};

/** The school's store for calls to SSLCommerz, or null when it is not set up. */
export const storeOf = async (schoolId: string): Promise<(Store & { enabled: boolean; chargePercent: string }) | null> => {
  const row = await settingsOf(schoolId);
  if (!row?.storeId || !row.storePassword) return null;
  return { storeId: row.storeId, storePassword: open(row.storePassword), sandbox: row.sandbox, enabled: row.enabled, chargePercent: row.chargePercent.toFixed(2) };
};

/*
 * Checks the saved credentials: asks SSLCommerz about a made-up transaction of ours. A store
 * it knows answers (with no such transaction); wrong credentials are refused. Nothing is
 * charged and no payment is started.
 */
const testConnection = async (schoolId: string) => {
  const store = await storeOf(schoolId);
  if (!store) throw new AppError("Save the SSLCommerz Store ID and password first", httpStatus.BAD_REQUEST);

  let ok = false;
  let message: string;
  try {
    const result = await findByTranId(store, `TEST-${randomBytes(6).toString("hex")}`);
    ok = result.apiOk;
    message = ok ? "Connected" : result.apiStatus || "SSLCommerz refused these credentials";
  } catch (error) {
    message = `Could not reach SSLCommerz: ${(error as Error).message}`;
  }
  await prisma.onlinePaymentSetting.update({ where: { schoolId }, data: { lastTestAt: new Date(), lastTestOk: ok, lastTestMessage: message.slice(0, 200) } });
  return getSettings(schoolId);
};

export const OnlinePaymentService = { getSettings, saveSettings, testConnection };
