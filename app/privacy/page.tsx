import type { Metadata } from "next";

import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";

export const metadata: Metadata = {
  title: "Privacy Policy — PlaySync",
  description:
    "PlaySync is anonymous by design: no accounts, no sign-up, and live sessions that delete themselves within 24 hours.",
};

const sections = [
  {
    title: "The short version",
    body: [
      "PlaySync works without accounts. Nobody signs up, nobody logs in, and we never ask for an email address, phone number, or password. A live session is a short code — anyone with the code can watch, and it deletes itself within 24 hours.",
    ],
  },
  {
    title: "What we store, and for how long",
    body: [
      "When an organizer publishes a live session, we store what the organizer typed: the session name, player names (usually first names), the format, courts, and game scores. This lives on our servers only so people with the link can follow along, and it is automatically deleted 24 hours after the session's last update.",
      "The organizer's device also keeps the session locally so an evening survives app restarts and bad gym Wi-Fi. That local copy stays on the device and can be cleared by starting a new session or deleting the app / clearing browser data.",
      "A random, anonymous token is created when a session is published so that only the organizer's device can change scores. It is not tied to any identity.",
    ],
  },
  {
    title: "Who can see a session",
    body: [
      "Live sessions are visible to anyone who has the 6-character code or the link — that is the point of the product. Use first names or nicknames if a player prefers not to appear. Sessions cannot be searched or listed; someone needs the code.",
    ],
  },
  {
    title: "Analytics and crash reporting",
    body: [
      "We collect anonymous usage analytics (for example: a session was created, a live link was opened) to understand what to improve. Analytics identifiers are random and not linked to names entered in sessions. The mobile apps may also send anonymous crash reports so we can fix bugs.",
      "We do not run ads, we do not sell data, and we do not share session contents with anyone.",
    ],
  },
  {
    title: "Children",
    body: [
      "PlaySync does not knowingly collect personal information from children. Player names in a session are entered by the session organizer, and sessions delete themselves within 24 hours.",
    ],
  },
  {
    title: "Changes and contact",
    body: [
      "If this policy changes, the date below changes with it. Questions or a request to remove something: email esteban.chirinos@gmail.com and include the session code if you have it.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <Header />
      <main className="container mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          PlaySync
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Applies to playsync.fun and the PlaySync mobile apps · Last updated
          July 11, 2026
        </p>

        <div className="mt-10 flex flex-col gap-10">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-semibold">{section.title}</h2>
              {section.body.map((paragraph) => (
                <p
                  key={paragraph.slice(0, 32)}
                  className="mt-3 leading-relaxed text-muted-foreground"
                >
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
