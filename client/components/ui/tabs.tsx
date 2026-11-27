"use client"

import * as React from "react"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn("flex flex-col gap-5", className)} {...props} />
}

/*
 * Three looks, matching the sidebar:
 * - "strip": a page's own parts, under its header panel. A white strip of its own with icons and
 *   labels; the open one in the accent with a thick underline. `end` sits at the strip's right
 *   end (e.g. a Setup menu). The tabs scroll inside the strip, never past the screen's edge.
 * - "line" (default): sections inside a page's part. Quiet labels on a hairline; the open one in
 *   full colour with the accent underline.
 * - "chip": tabs inside a tab, or a small switch. Small rounded labels on a grey band; the open
 *   one a white chip.
 */
function TabsList({
  className,
  variant = "line",
  end,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & { variant?: "line" | "chip" | "strip"; end?: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null)

  // keep the open tab in view when the row scrolls (a phone, or a part opened from a link)
  React.useEffect(() => {
    const list = ref.current
    if (!list) return
    const reveal = () => {
      const open = list.querySelector<HTMLElement>('[data-state="active"]')
      if (!open || list.scrollWidth <= list.clientWidth) return
      const left = open.offsetLeft - list.offsetLeft
      if (left < list.scrollLeft) list.scrollLeft = left - 16
      else if (left + open.offsetWidth > list.scrollLeft + list.clientWidth)
        list.scrollLeft = left + open.offsetWidth - list.clientWidth + 16
    }
    reveal()
    const watch = new MutationObserver(reveal)
    watch.observe(list, { attributes: true, subtree: true, attributeFilter: ["data-state"] })
    return () => watch.disconnect()
  }, [])

  const list = (
    <TabsPrimitive.List
      ref={ref}
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(
        "group/tabs-list inline-flex max-w-full min-w-0 items-center overflow-x-auto [scrollbar-width:none] text-muted-foreground [&::-webkit-scrollbar]:hidden",
        // the hairline is an inset shadow, so the open tab's underline can sit over it without overflowing
        variant === "line" && "w-full gap-6 shadow-[inset_0_-1px_0_var(--border)]",
        variant === "chip" && "w-fit gap-1 rounded-lg bg-muted/70 p-1",
        variant === "strip" && "flex-1 items-stretch gap-0.5 self-stretch",
        variant !== "strip" && className
      )}
      {...props}
    />
  )
  if (variant !== "strip") return list
  return (
    <div
      data-slot="tabs-strip"
      className={cn("flex w-full max-w-full min-w-0 items-stretch rounded-2xl border border-border/60 bg-card px-1", end && "pr-2", className)}
    >
      {list}
      {end && <div className="flex shrink-0 items-center pl-2">{end}</div>}
    </div>
  )
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 text-sm font-medium whitespace-nowrap transition-colors outline-none",
        "hover:text-foreground disabled:pointer-events-none disabled:opacity-50",
        "focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        // line
        "group-data-[variant=line]/tabs-list:relative group-data-[variant=line]/tabs-list:h-11 group-data-[variant=line]/tabs-list:px-0.5 group-data-[variant=line]/tabs-list:text-foreground/60",
        "group-data-[variant=line]/tabs-list:after:absolute group-data-[variant=line]/tabs-list:after:inset-x-0 group-data-[variant=line]/tabs-list:after:bottom-0 group-data-[variant=line]/tabs-list:after:h-0.5 group-data-[variant=line]/tabs-list:after:rounded-full",
        "group-data-[variant=line]/tabs-list:data-[state=active]:font-semibold group-data-[variant=line]/tabs-list:data-[state=active]:text-foreground group-data-[variant=line]/tabs-list:data-[state=active]:after:bg-brand",
        // strip: the icons quiet until open; the underline sits on the strip's bottom edge
        "group-data-[variant=strip]/tabs-list:relative group-data-[variant=strip]/tabs-list:h-12 group-data-[variant=strip]/tabs-list:gap-2 group-data-[variant=strip]/tabs-list:px-3 group-data-[variant=strip]/tabs-list:text-[15px] group-data-[variant=strip]/tabs-list:text-foreground/60 group-data-[variant=strip]/tabs-list:focus-visible:ring-inset sm:group-data-[variant=strip]/tabs-list:px-3.5",
        "group-data-[variant=strip]/tabs-list:[&_svg]:text-muted-foreground group-data-[variant=strip]/tabs-list:data-[state=active]:[&_svg]:text-navy",
        "group-data-[variant=strip]/tabs-list:after:absolute group-data-[variant=strip]/tabs-list:after:inset-x-2.5 group-data-[variant=strip]/tabs-list:after:bottom-0 group-data-[variant=strip]/tabs-list:after:h-[3px] group-data-[variant=strip]/tabs-list:after:rounded-t-[3px]",
        "group-data-[variant=strip]/tabs-list:data-[state=active]:font-bold group-data-[variant=strip]/tabs-list:data-[state=active]:text-navy group-data-[variant=strip]/tabs-list:data-[state=active]:after:bg-navy",
        // chip
        "group-data-[variant=chip]/tabs-list:h-7 group-data-[variant=chip]/tabs-list:rounded-md group-data-[variant=chip]/tabs-list:px-3 group-data-[variant=chip]/tabs-list:text-[15px]",
        "group-data-[variant=chip]/tabs-list:data-[state=active]:bg-background group-data-[variant=chip]/tabs-list:data-[state=active]:text-navy group-data-[variant=chip]/tabs-list:data-[state=active]:shadow-sm",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn("flex-1 outline-none", className)} {...props} />
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
