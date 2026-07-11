import type { ComponentProps } from "react";
import Image from "next/image";

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
          "grid shrink-0 place-items-center overflow-hidden border border-border bg-card text-foreground",
          isSmall ? "size-8 rounded-md" : "size-9 rounded-md",
          markClassName
        )}
        aria-hidden="true"
      >
        <Image
          src="/playsync-logo-icon.png"
          alt=""
          width={isSmall ? 32 : 36}
          height={isSmall ? 32 : 36}
          sizes={isSmall ? "32px" : "36px"}
          className="brand-mark-image h-full w-full object-contain"
        />
      </span>
      {showWordmark && (
        <span
          className={cn(
            "flex min-w-0 items-baseline font-sans font-semibold leading-none tracking-normal text-foreground",
            isSmall ? "text-lg" : "text-xl",
            wordmarkClassName
          )}
        >
          <span>Play</span>
          <span>Sync</span>
        </span>
      )}
    </span>
  );
}
