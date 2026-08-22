import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // Chunky playful-kit buttons: flat fill + 4px darker bottom edge, pressed
  // by translating down onto the edge (90ms). Uppercase 800 like the kit.
  "inline-flex touch-target items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-extrabold uppercase tracking-[0.05em] transition-[translate,box-shadow,background-color,color] duration-100 active:translate-y-[4px] active:shadow-none disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-60 disabled:shadow-none [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/45 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_4px_0_var(--primary-edge)] hover:bg-primary/92",
        destructive:
          "bg-destructive text-white shadow-[0_4px_0_var(--destructive-edge)] hover:bg-[oklch(from_var(--destructive)_calc(l-0.04)_c_h)] focus-visible:ring-destructive/25",
        outline:
          "border-2 border-input bg-card text-(--cta-outline-text) shadow-[0_4px_0_var(--input)] hover:bg-secondary/50",
        secondary:
          "bg-secondary text-secondary-foreground shadow-[0_4px_0_var(--input)] hover:bg-secondary/80",
        ghost:
          "shadow-none normal-case tracking-normal font-bold active:translate-y-0 hover:bg-secondary/70 hover:text-foreground",
        link: "text-success underline-offset-4 hover:underline normal-case tracking-normal active:translate-y-0",
      },
      size: {
        default: "h-11 px-5 py-2 has-[>svg]:px-4",
        // Compact sizes keep desktop density; pointer-coarse restores the 44px touch target on phones
        xs: "h-7 min-h-7 gap-1 rounded-lg px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3 pointer-coarse:min-h-11 pointer-coarse:min-w-11",
        sm: "h-9 min-h-9 rounded-xl gap-1.5 px-3 has-[>svg]:px-2.5 pointer-coarse:min-h-11 pointer-coarse:min-w-11",
        lg: "h-13 min-h-13 px-6 text-[15px] has-[>svg]:px-4",
        icon: "size-11",
        "icon-xs": "size-6 rounded-lg [&_svg:not([class*='size-'])]:size-3 pointer-coarse:min-h-11 pointer-coarse:min-w-11",
        "icon-sm": "size-9 pointer-coarse:min-h-11 pointer-coarse:min-w-11",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
