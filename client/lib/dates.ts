/** "2027-03-26" from a server date ("2027-03-26T00:00:00.000Z"): calendar dates are stored as midnight UTC. */
export const dayKey = (date: string) => date.slice(0, 10);
