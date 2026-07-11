import type { Metadata } from "next";
import Link from "next/link";

import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";

export const metadata: Metadata = {
  title: "Support — PlaySync",
  description:
    "Help for organizing and watching PlaySync live sessions: quick start, common questions, and how to reach us.",
};

const faqs = [
  {
    question: "The link or QR says the session wasn't found.",
    answer:
      "Live sessions delete themselves 24 hours after their last update, so yesterday's link is gone on purpose. Ask the organizer to publish a fresh link from tonight's session. If it happens during a session, the organizer can open the share screen and publish again — the code stays the same.",
  },
  {
    question: "Do players need to install anything or sign up?",
    answer:
      "No. Players and spectators open the link or scan the QR in any browser — no app, no account, no payment. Only the organizer keeps the session on their phone.",
  },
  {
    question: "Can spectators change scores?",
    answer:
      "No. Only the organizer's device can save scores. Everyone else sees a live, read-only view of courts, scores, and standings.",
  },
  {
    question: "Someone arrived late or has to leave — do we start over?",
    answer:
      "Never. Late arrivals, sit-outs, and substitutions only change future rounds; every score already played stays exactly as it was. Look for the roster actions on the scoring screen.",
  },
  {
    question: "How are standings ranked?",
    answer:
      "Wins first, then head-to-head between tied players, then point difference. Players who are tied on every tiebreaker share a rank — that's the T in T1.",
  },
  {
    question: "The live page stopped updating.",
    answer:
      "The organizer's phone pushes updates whenever it has signal; scores save on the phone even offline and sync automatically when the connection returns. If a spectator page looks stale, pull to refresh or reopen the link.",
  },
];

export default function SupportPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <Header />
      <main className="container mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          PlaySync
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Support
        </h1>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Everything here assumes the courtside reality: one organizer with a
          phone, everyone else just playing. If something below doesn't solve
          it, email us — a real person reads it.
        </p>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Quick start</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 leading-relaxed text-muted-foreground">
            <li>
              <Link
                href="/tournament?new=1"
                className="font-medium text-foreground underline underline-offset-4"
              >
                Create a session
              </Link>{" "}
              — paste the group list, pick a format, start Round 1.
            </li>
            <li>
              Open the share screen and publish — you get a short link and a QR
              anyone can scan.
            </li>
            <li>
              Save scores as games finish. Standings, next rounds, and every
              spectator page update on their own.
            </li>
          </ol>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Common questions</h2>
          <div className="mt-3 flex flex-col gap-6">
            {faqs.map((faq) => (
              <div key={faq.question}>
                <h3 className="font-semibold">{faq.question}</h3>
                <p className="mt-2 leading-relaxed text-muted-foreground">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Contact</h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            Email{" "}
            <a
              href="mailto:esteban.chirinos@gmail.com"
              className="font-medium text-foreground underline underline-offset-4"
            >
              esteban.chirinos@gmail.com
            </a>{" "}
            with what happened and, if you have it, the 6-character session
            code. Session data deletes itself within 24 hours, so the sooner
            the better.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
