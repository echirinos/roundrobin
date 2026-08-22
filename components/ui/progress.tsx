"use client"

import * as React from "react"
import { Progress as ProgressPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "relative h-3.5 w-full overflow-hidden rounded-full bg-input",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        // Rounded fill with the kit's white highlight strip riding on top.
        className="relative h-full w-full flex-1 rounded-full bg-primary transition-transform duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] after:absolute after:inset-x-2 after:top-[3px] after:h-1 after:rounded-full after:bg-white/40"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
