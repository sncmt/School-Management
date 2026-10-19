// SMS constants usable on the server (pages) and in the browser; the API hooks are in ./sms.

export const SMS_ACTIVITIES = ["admission", "payment", "attendance", "result", "fee_due", "promotion"] as const;
export type SmsActivity = (typeof SMS_ACTIVITIES)[number];

/** The permission that turns an activity's automatic SMS on or off. */
export const activityPermission = (activity: SmsActivity) => `sms:${activity}`;

// every SMS permission: the SMS page shows to anyone with one of them
export const SMS_PERMISSIONS = [...SMS_ACTIVITIES.map(activityPermission), "sms:templates", "sms:send", "sms:log", "sms:gateway"];
