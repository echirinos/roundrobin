import Link from "next/link";
import { PlaySyncLogo } from "@/components/brand/playsync-logo";

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-muted/30">
      <div className="container mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="flex flex-col gap-4">
            <Link
              href="/"
              className="w-fit rounded-xl transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <PlaySyncLogo />
            </Link>
            <p className="text-sm text-muted-foreground">
              Phone-first pickleball round robin setup for real courtside use.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <h4 className="text-sm font-semibold">Start</h4>
            <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
              <li>
                <Link
                  href="/tournament?new=1&mode=rotating"
                  className="transition-colors hover:text-foreground"
                  data-analytics-event="create_session_clicked"
                  data-analytics-location="footer"
                  data-analytics-mode="rotating"
                >
                  Create a session
                </Link>
              </li>
              <li className="text-muted-foreground/80">
                Round robin or set teams
              </li>
              <li>
                <Link
                  href="/tournament?join=1"
                  className="transition-colors hover:text-foreground"
                  data-analytics-event="join_code_clicked"
                  data-analytics-location="footer"
                >
                  Join code
                </Link>
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-4">
            <h4 className="text-sm font-semibold">On this page</h4>
            <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
              <li>
                <Link
                  href="#features"
                  className="transition-colors hover:text-foreground"
                  data-analytics-event="navigation_clicked"
                  data-analytics-location="footer"
                  data-analytics-target="Features"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href="#how-it-works"
                  className="transition-colors hover:text-foreground"
                  data-analytics-event="navigation_clicked"
                  data-analytics-location="footer"
                  data-analytics-target="Courtside flow"
                >
                  Courtside flow
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/40 pt-8 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} PlaySync. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">
            No sign-up required to start a session.
          </p>
        </div>
      </div>
    </footer>
  );
}
