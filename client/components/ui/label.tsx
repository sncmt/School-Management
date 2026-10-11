"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Label as LabelPrimitive } from "radix-ui"

/** The red star after a required field's label. Fields without it are optional. */
function RequiredMark() {
  return (
    <span aria-hidden="true" className="-ml-1 text-destructive">
      *
    </span>
  )
}

function Label({
  className,
  required,
  children,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root> & { required?: boolean }) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
      {required && <RequiredMark />}
    </LabelPrimitive.Root>
  )
}

export { Label, RequiredMark }
