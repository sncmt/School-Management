"use client"

import * as React from "react"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn("flex flex-col gap-5", className)} {...props} />
}

/*
 * Two looks, matching the sidebar:
 * - "line" (default): the page's sections. Quiet labels on a hairline; the open one in full
 *   colour with the accent underline.
 * - "chip": tabs inside a tab, or a small switch. Small rounded labels on a grey band; the open
 *   one a white chip.
 */
function TabsList({
  className,
  variant = "line",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & { variant?: "line" | "chip" }) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(
        "group/tabs-list inline-flex max-w-full items-center overflow-x-auto [scrollbar-width:none] text-muted-foreground",
        // the hairline is an inset shadow, so the open tab's underline can sit over it without overflowing
        variant === "line" && "w-full gap-6 shadow-[inset_0_-1px_0_var(--border)]",
        variant === "chip" && "w-fit gap-1 rounded-lg bg-muted/70 p-1",
        className
      )}
      {...props}
    />
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
        // chip
        "group-data-[variant=chip]/tabs-list:h-7 group-data-[variant=chip]/tabs-list:rounded-md group-data-[variant=chip]/tabs-list:px-3 group-data-[variant=chip]/tabs-list:text-[13px]",
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
