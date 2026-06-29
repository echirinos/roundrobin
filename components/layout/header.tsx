"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PlaySyncLogo } from "@/components/brand/playsync-logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const navItems = [
  { href: "#features", label: "Product" },
  { href: "#how-it-works", label: "Flow" },
  { href: "/tournament?join=1", label: "Join code" },
];

export function Header() {
  return (
    <header className="site-header sticky top-0 z-50 w-full">
      <div className="mx-auto flex h-[4.25rem] w-full max-w-[90rem] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label="PlaySync home"
          className="group inline-flex min-h-11 items-center rounded-full pr-3 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <PlaySyncLogo
            size="sm"
            className="gap-2.5"
            markClassName="site-logo-mark"
            wordmarkClassName="text-[1.15rem] sm:text-[1.22rem]"
          />
        </Link>

        <nav
          aria-label="Primary navigation"
          className="site-nav-pill hidden items-center md:flex"
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="site-nav-link"
              data-analytics-event="navigation_clicked"
              data-analytics-location="header"
              data-analytics-target={item.label}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex min-w-0 items-center justify-end gap-2">
          <ThemeToggle />
          <Button
            asChild
            size="sm"
            variant="outline"
            className="site-header-secondary hidden h-11 rounded-full px-4 font-medium sm:inline-flex"
          >
            <Link
              href="/tournament?join=1"
              data-analytics-event="join_code_clicked"
              data-analytics-location="header"
            >
              Join
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            className="site-header-primary h-11 rounded-full px-4 font-semibold"
          >
            <Link
              href="/tournament?new=1&mode=rotating"
              data-analytics-event="create_session_clicked"
              data-analytics-location="header"
              data-analytics-mode="rotating"
            >
              <span className="hidden sm:inline">Create session</span>
              <span className="sm:hidden">Create</span>
              <ArrowRight className="hidden size-3.5 sm:block" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
