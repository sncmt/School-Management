import type { SmsProvider } from "../../../../generated/prisma/enums";

/*
 * The gateways an SMS can go through. Each school picks its own (SmsSetting.provider) and pays
 * it directly. Only TEST exists for now: it logs the SMS and reports it sent, so everything
 * else (templates, switches, the log) works before a real gateway is connected.
 *
 * Adding a real gateway: add it to the SmsProvider enum, keep its account details on the
 * school's SmsSetting, and add its driver below.
 */

export type OutgoingSms = { phone: string; body: string; senderId: string | null };
export type SendResult = { providerRef: string };

type Driver = (sms: OutgoingSms) => Promise<SendResult>;

const drivers: Record<SmsProvider, Driver> = {
  TEST: async (sms) => {
    console.log(`[sms:test] to ${sms.phone}${sms.senderId ? ` from ${sms.senderId}` : ""}: ${sms.body}`);
    return { providerRef: `test-${Date.now().toString(36)}` };
  },
};

/** Sends through the school's gateway; throws when the gateway refuses or can't be reached. */
export const sendThrough = (provider: SmsProvider, sms: OutgoingSms) => drivers[provider](sms);
