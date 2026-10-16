/** "2027-03-26" from a server date ("2027-03-26T00:00:00.000Z"): calendar dates are stored as midnight UTC. */
export const dayKey = (date: string) => date.slice(0, 10);

/** The day in Bangladesh of a moment ("2026-10-14T19:30:00Z" -> "2026-10-15"), for timestamps that aren't calendar dates. */
export const bangladeshDay = (moment: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(moment));
