import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "placeholder:text-muted-foreground placeholder:font-bold selection:bg-primary selection:text-primary-foreground border-input flex field-sizing-content min-h-20 w-full rounded-2xl border-2 bg-card px-3.5 py-2 text-base font-bold transition-[color,box-shadow,background,border-color] outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:bg-background focus-visible:ring-ring/45 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
