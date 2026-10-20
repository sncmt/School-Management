// The top bar's buttons: a white rounded square with a hairline (search, messages, language, theme);
// a little smaller on a phone, where the bar is short of room
export const topBarButton =
  "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl border bg-background text-sm text-foreground/80 shadow-xs transition-colors hover:bg-muted/60 hover:text-foreground data-[state=open]:bg-muted/60 data-[state=open]:text-foreground sm:h-10";

// the icon-only ones
export const topBarIconButton = `${topBarButton} w-9 sm:w-10`;
