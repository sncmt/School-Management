import type { SmsEvent, SmsLanguage } from "../../../../generated/prisma/enums";

/*
 * The automatic SMS: which activity (and permission) each belongs to, the placeholders it may
 * use, and its default wording in Bangla and English. A school's own wording (SmsTemplate)
 * replaces the default; clearing it brings the default back.
 */

export const SMS_ACTIVITIES = ["admission", "payment", "attendance", "result", "fee_due", "promotion"] as const;
export type SmsActivity = (typeof SMS_ACTIVITIES)[number];

type EventInfo = {
  activity: SmsActivity;
  placeholders: string[];
  defaults: Record<SmsLanguage, string>;
};

// English defaults avoid ৳ and other non-GSM characters: one of them makes the whole SMS Unicode (70 characters a part)
export const SMS_EVENTS: Record<SmsEvent, EventInfo> = {
  STUDENT_ADMITTED: {
    activity: "admission",
    placeholders: ["student", "class", "year", "admissionNo", "school"],
    defaults: {
      BN: "সম্মানিত অভিভাবক, {student} {year} শিক্ষাবর্ষে {class} শ্রেণিতে ভর্তি হয়েছে। ভর্তি নং: {admissionNo}। -{school}",
      EN: "Dear guardian, {student} has been admitted to class {class} ({year}). Admission no: {admissionNo}. -{school}",
    },
  },
  PAYMENT_RECEIVED: {
    activity: "payment",
    placeholders: ["student", "amount", "receipt", "school"],
    defaults: {
      BN: "সম্মানিত অভিভাবক, {student}-এর {amount} টাকা জমা হয়েছে। রসিদ: {receipt}। ধন্যবাদ। -{school}",
      EN: "Dear guardian, Tk {amount} received for {student}. Receipt: {receipt}. Thank you. -{school}",
    },
  },
  PAYMENT_CANCELLED: {
    activity: "payment",
    placeholders: ["student", "amount", "receipt", "school"],
    defaults: {
      BN: "সম্মানিত অভিভাবক, {student}-এর {amount} টাকার জমা (রসিদ {receipt}) বাতিল হয়েছে। -{school}",
      EN: "Dear guardian, the payment of Tk {amount} for {student} (receipt {receipt}) was cancelled. -{school}",
    },
  },
  STUDENT_ABSENT: {
    activity: "attendance",
    placeholders: ["student", "date", "school"],
    defaults: {
      // the most frequent SMS: kept to one Bangla SMS (70 characters) for usual names
      BN: "{student} {date} তারিখে অনুপস্থিত ছিল। -{school}",
      EN: "Dear guardian, {student} was absent on {date}. -{school}",
    },
  },
  STUDENT_LATE: {
    activity: "attendance",
    placeholders: ["student", "date", "school"],
    defaults: {
      BN: "{student} {date} তারিখে দেরিতে এসেছে। -{school}",
      EN: "Dear guardian, {student} came late on {date}. -{school}",
    },
  },
  RESULT_PUBLISHED: {
    activity: "result",
    placeholders: ["student", "exam", "class", "school"],
    defaults: {
      BN: "সম্মানিত অভিভাবক, {student}-এর {exam}-এর ফলাফল প্রকাশিত হয়েছে। অ্যাপে দেখুন। -{school}",
      EN: "Dear guardian, {student}'s {exam} result is out. Please check the app. -{school}",
    },
  },
  ADMIT_CARD_RELEASED: {
    activity: "result",
    placeholders: ["student", "exam", "school"],
    defaults: {
      BN: "সম্মানিত অভিভাবক, {student}-এর {exam}-এর প্রবেশপত্র অ্যাপে পাওয়া যাচ্ছে। -{school}",
      EN: "Dear guardian, {student}'s admit card for {exam} is ready in the app. -{school}",
    },
  },
  FEE_DUE: {
    activity: "fee_due",
    placeholders: ["student", "amount", "fees", "school"],
    defaults: {
      BN: "সম্মানিত অভিভাবক, {student}-এর {amount} টাকা ফি বকেয়া আছে। দ্রুত পরিশোধ করুন। -{school}",
      EN: "Dear guardian, Tk {amount} in fees is due for {student}. Please pay soon. -{school}",
    },
  },
  STUDENT_PROMOTED: {
    activity: "promotion",
    placeholders: ["student", "class", "year", "school"],
    defaults: {
      BN: "অভিনন্দন! {student} {year} শিক্ষাবর্ষে {class} শ্রেণিতে উত্তীর্ণ হয়েছে। -{school}",
      EN: "Congratulations! {student} has been promoted to class {class} ({year}). -{school}",
    },
  },
  STUDENT_GRADUATED: {
    activity: "promotion",
    placeholders: ["student", "class", "school"],
    defaults: {
      BN: "অভিনন্দন! {student} {class} শ্রেণি সম্পন্ন করেছে। শুভকামনা। -{school}",
      EN: "Congratulations! {student} has completed class {class}. Best wishes. -{school}",
    },
  },
};

/** The permission that turns an activity's SMS on or off. */
export const activityPermission = (activity: SmsActivity) => `sms:${activity}`;

/** Fills {name} placeholders; an unknown one is left as written. */
export const fillTemplate = (body: string, values: Record<string, string>) =>
  body.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);

/** Placeholders a template uses that its event doesn't have. */
export const unknownPlaceholders = (event: SmsEvent, body: string) => {
  const allowed = new Set(SMS_EVENTS[event].placeholders);
  return [...body.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).filter((name) => !allowed.has(name));
};

// ------------------------------------------------------------------ length

// the GSM 03.38 alphabet: an SMS of only these is 160 characters a part; the second set counts double
const GSM_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM_EXTENDED = "^{}\\[~]|€\f";

/** How many SMS a text takes: GSM 160 (153 each when split), Unicode 70 (67 each when split). */
export const smsParts = (text: string) => {
  let gsmLength = 0;
  for (const ch of text) {
    if (GSM_BASIC.includes(ch)) gsmLength += 1;
    else if (GSM_EXTENDED.includes(ch)) gsmLength += 2;
    else {
      // Unicode: counted in UTF-16 units
      const length = text.length;
      return { encoding: "UNICODE" as const, length, parts: length <= 70 ? 1 : Math.ceil(length / 67) };
    }
  }
  return { encoding: "GSM" as const, length: gsmLength, parts: gsmLength <= 160 ? 1 : Math.ceil(gsmLength / 153) };
};
