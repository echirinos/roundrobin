"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariantsOuter = cva("", {
  variants: {
    variant: {
      primary:
        "w-full border border-primary/45 bg-primary/85 p-[1px] shadow-sm transition duration-300 ease-in-out",
      accent:
        "w-full border border-live/45 bg-live/85 p-[1px] shadow-sm transition duration-300 ease-in-out",
      destructive:
        "w-full border border-destructive/45 bg-destructive/85 p-[1px] shadow-sm transition duration-300 ease-in-out",
      secondary:
        "w-full border border-border/75 bg-secondary/70 p-[1px] shadow-sm transition duration-300 ease-in-out",
      minimal:
        "group/texture-button w-full border border-border/75 bg-background/70 p-[1px] shadow-sm transition duration-300 ease-in-out hover:bg-secondary/60 active:bg-secondary",
      icon: "group/texture-button rounded-full border border-border/75 bg-background/70 p-[1px] shadow-sm transition duration-300 ease-in-out hover:bg-secondary/60 active:bg-secondary",
    },
    size: {
      sm: "rounded-[6px]",
      default: "rounded-[12px]",
      lg: "rounded-[12px]",
      icon: "rounded-full",
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "default",
  },
})

const innerDivVariants = cva(
  "flex h-full w-full items-center justify-center text-muted-foreground",
  {
    variants: {
      variant: {
        primary:
          "gap-2 bg-primary text-sm font-semibold text-primary-foreground transition duration-300 ease-in-out hover:bg-primary/90 active:bg-primary/80",
        accent:
          "gap-2 bg-live text-sm font-semibold text-live-foreground transition duration-300 ease-in-out hover:bg-live/90 active:bg-live/80",
        destructive:
          "gap-2 bg-destructive text-sm font-semibold text-white transition duration-300 ease-in-out hover:bg-destructive/90 active:bg-destructive/80",
        secondary:
          "bg-secondary text-sm font-semibold text-secondary-foreground transition duration-300 ease-in-out hover:bg-secondary/85 active:bg-secondary/75",
        minimal:
          "bg-background/80 text-sm font-semibold text-foreground transition duration-300 ease-in-out group-hover/texture-button:bg-secondary/65 group-active/texture-button:bg-secondary",
        icon: "rounded-full bg-background/80 text-foreground transition duration-300 ease-in-out group-hover/texture-button:bg-secondary/65 group-active/texture-button:bg-secondary",
      },
      size: {
        sm: "text-xs rounded-[4px] px-4 py-1",
        default: "text-sm rounded-[10px] px-4 py-2",
        lg: "text-base rounded-[10px] px-4 py-2",
        icon: " rounded-full p-1",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

export interface UnifiedButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "secondary"
    | "accent"
    | "destructive"
    | "minimal"
    | "icon"
  size?: "default" | "sm" | "lg" | "icon"
  asChild?: boolean
}

const TextureButton = React.forwardRef<HTMLButtonElement, UnifiedButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "default",
      asChild = false,
      className,
      ...props
    },
    ref
  ) => {
    const innerContent = (content: React.ReactNode) => (
      <div className={cn(innerDivVariants({ variant, size }))}>{content}</div>
    )

    if (asChild) {
      const child = React.Children.only(children)

      if (!React.isValidElement<{ children?: React.ReactNode }>(child)) {
        return null
      }

      return (
        <Slot
          className={cn(buttonVariantsOuter({ variant, size }), className)}
          ref={ref as React.Ref<HTMLElement>}
          {...props}
        >
          {React.cloneElement(
            child,
            undefined,
            innerContent(child.props.children)
          )}
        </Slot>
      )
    }

    return (
      <button
        className={cn(buttonVariantsOuter({ variant, size }), className)}
        ref={ref}
        {...props}
      >
        {innerContent(children)}
      </button>
    )
  }
)

TextureButton.displayName = "TextureButton"

export { TextureButton }

// export default TextureButton
