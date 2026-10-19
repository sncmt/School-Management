// One colour per class of the exam (by its place in the class list), so a room shows at a
// glance that neighbours are from different classes. The class name is always written too.
const COLORS = [
  { tile: "border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/50", dot: "bg-blue-500" },
  { tile: "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40", dot: "bg-amber-500" },
  { tile: "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40", dot: "bg-emerald-500" },
  { tile: "border-violet-300 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/40", dot: "bg-violet-500" },
  { tile: "border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/40", dot: "bg-rose-500" },
  { tile: "border-cyan-300 bg-cyan-50 dark:border-cyan-800 dark:bg-cyan-950/40", dot: "bg-cyan-500" },
  { tile: "border-lime-300 bg-lime-50 dark:border-lime-800 dark:bg-lime-950/40", dot: "bg-lime-600" },
  { tile: "border-orange-300 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/40", dot: "bg-orange-500" },
] as const;

export const classColor = (index: number) => COLORS[((index % COLORS.length) + COLORS.length) % COLORS.length];
