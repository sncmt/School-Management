"use client"

import * as React from "react"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn("flex flex-col gap-5", className)} {...props} />
}

/*
 * Two looks, matching the sidebar:
 * - "line" (default): the page's sections. Quiet labels on a hairline; the open one in navy
 *   with the amber bar the sidebar puts on its current page.
 * - "chip": tabs inside a tab, or a small switch. Small rounded labels; the open one a navy chip.
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
        // the hairline is an inset shadow, so the scrolling row doesn't clip the bar
        variant === "line" && "w-full gap-6 shadow-[inset_0_-1px_0_var(--color-border)]",
        variant === "chip" && "w-fit gap-1 rounded-full bg-muted/60 p-1",
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
        "group-data-[variant=line]/tabs-list:h-11 group-data-[variant=line]/tabs-list:rounded-none group-data-[variant=line]/tabs-list:border-b-2 group-data-[variant=line]/tabs-list:border-transparent group-data-[variant=line]/tabs-list:px-0.5 group-data-[variant=line]/tabs-list:pt-0.5",
        "group-data-[variant=line]/tabs-list:data-[state=active]:border-brand group-data-[variant=line]/tabs-list:data-[state=active]:text-navy group-data-[variant=line]/tabs-list:data-[state=active]:[&_svg]:text-brand",
        // chip
        "group-data-[variant=chip]/tabs-list:h-8 group-data-[variant=chip]/tabs-list:rounded-full group-data-[variant=chip]/tabs-list:px-3.5 group-data-[variant=chip]/tabs-list:text-[13px]",
        "group-data-[variant=chip]/tabs-list:data-[state=active]:bg-navy group-data-[variant=chip]/tabs-list:data-[state=active]:text-navy-foreground group-data-[variant=chip]/tabs-list:data-[state=active]:shadow-sm",
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
