import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type PlaySyncLogoProps = ComponentProps<"span"> & {
  markClassName?: string;
  showWordmark?: boolean;
  size?: "sm" | "md";
  wordmarkClassName?: string;
};

export function PlaySyncLogo({
  className,
  markClassName,
  showWordmark = true,
  size = "md",
  wordmarkClassName,
  ...props
}: PlaySyncLogoProps) {
  const isSmall = size === "sm";

  return (
    <span
      className={cn("inline-flex min-w-0 items-center gap-2.5", className)}
      {...props}
    >
      <span
        className={cn(
          "relative isolate grid shrink-0 place-items-center overflow-hidden border border-foreground/10 bg-foreground shadow-[0_12px_34px_-20px_rgb(12_28_16_/_0.72)]",
          isSmall ? "size-8 rounded-[10px]" : "size-9 rounded-[12px]",
          "dark:border-primary/20 dark:bg-card",
          markClassName
        )}
        aria-hidden="true"
      >
        <span className="absolute inset-0 bg-[radial-gradient(circle_at_72%_18%,var(--primary),transparent_42%),radial-gradient(circle_at_20%_86%,var(--live),transparent_34%)] opacity-95" />
        <span className="absolute inset-[3px] rounded-[inherit] border border-background/10 bg-foreground/72 dark:bg-background/64" />
        <svg
          viewBox="0 0 40 40"
          fill="none"
          className={cn(
            "relative z-10",
            isSmall ? "size-[1.65rem]" : "size-7"
          )}
        >
          <path
            d="M8 13.25h24M8 26.75h24M13.5 8.25v23.5M26.5 8.25v23.5"
            stroke="var(--background)"
            strokeLinecap="round"
            strokeWidth="1.6"
            opacity="0.38"
          />
          <path
            d="M10.25 17.5c3.5-5.35 12.45-7.25 18.6-2.85"
            stroke="var(--primary)"
            strokeLinecap="round"
            strokeWidth="3"
          />
          <path
            d="M29.75 22.5c-3.5 5.35-12.45 7.25-18.6 2.85"
            stroke="var(--live)"
            strokeLinecap="round"
            strokeWidth="3"
          />
          <path
            d="m27.2 10.95 2.25 4.15-4.72.18"
            stroke="var(--primary)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.2"
          />
          <path
            d="m12.8 29.05-2.25-4.15 4.72-.18"
            stroke="var(--live)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.2"
          />
          <circle
            cx="20"
            cy="20"
            r="5.2"
            fill="var(--accent)"
            stroke="var(--background)"
            strokeWidth="1.8"
          />
          <circle cx="17.8" cy="18.6" r="0.85" fill="var(--foreground)" />
          <circle cx="21.9" cy="18.8" r="0.85" fill="var(--foreground)" />
          <circle cx="19.8" cy="22.3" r="0.85" fill="var(--foreground)" />
        </svg>
      </span>
      {showWordmark && (
        <span
          className={cn(
            "flex min-w-0 items-baseline font-display font-semibold leading-none tracking-normal text-foreground",
            isSmall ? "text-lg" : "text-xl",
            wordmarkClassName
          )}
        >
          <span>Play</span>
          <span className="text-primary">Sync</span>
        </span>
      )}
    </span>
  );
}
