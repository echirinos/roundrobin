"use client";

import Link from "next/link";
import { PlaySyncLogo } from "@/components/brand/playsync-logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-lg">
      <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="rounded-xl transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <PlaySyncLogo />
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href="#features"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Features
          </Link>
          <Link
            href="#how-it-works"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Flow
          </Link>
          <Link
            href="/tournament?join=1"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Join Code
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild size="sm" variant="outline" className="hidden font-medium sm:inline-flex">
            <Link href="/tournament?join=1">Join</Link>
          </Button>
          <Button asChild size="sm" className="font-medium">
            <Link href="/tournament?new=1&mode=rotating">Create</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
