"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { track } from "@vercel/analytics";
import posthog from "posthog-js";

const posthogKey =
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN ??
  process.env.NEXT_PUBLIC_POSTHOG_KEY;
const posthogHost =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

type AnalyticsProperties = Record<string, string | number | boolean>;

function toAnalyticsPropertyName(key: string): string {
  return key
    .replace(/^analytics/, "")
    .replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`)
    .replace(/^_/, "");
}

function readAnalyticsProperties(element: HTMLElement): AnalyticsProperties {
  const properties: AnalyticsProperties = {
    path: window.location.pathname,
  };

  if (window.location.search) {
    properties.search = window.location.search;
  }

  if (element instanceof HTMLAnchorElement) {
    properties.href = element.href;
  } else {
    const link = element.closest("a");

    if (link instanceof HTMLAnchorElement) {
      properties.href = link.href;
    }
  }

  const text = element.textContent?.trim().replace(/\s+/g, " ");

  if (text) {
    properties.label = text.slice(0, 80);
  }

  for (const [key, value] of Object.entries(element.dataset)) {
    if (!key.startsWith("analytics") || key === "analyticsEvent" || !value) {
      continue;
    }

    properties[toAnalyticsPropertyName(key)] = value;
  }

  return properties;
}

export function AnalyticsProvider() {
  const pathname = usePathname();
  const isPostHogReady = useRef(false);

  useEffect(() => {
    if (!posthogKey || isPostHogReady.current) return;

    posthog.init(posthogKey, {
      api_host: posthogHost,
      autocapture: false,
      capture_pageleave: true,
      capture_pageview: false,
      person_profiles: "identified_only",
    });

    isPostHogReady.current = true;
  }, []);

  useEffect(() => {
    if (!isPostHogReady.current) return;

    posthog.capture("$pageview", {
      $current_url: window.location.href,
      path: window.location.pathname,
      search: window.location.search || undefined,
    });
  }, [pathname]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!(event.target instanceof Element)) return;

      const target = event.target.closest<HTMLElement>(
        "[data-analytics-event]"
      );

      if (!target) return;

      const eventName = target.dataset.analyticsEvent;

      if (!eventName) return;

      const properties = readAnalyticsProperties(target);

      track(eventName, properties);

      if (isPostHogReady.current) {
        posthog.capture(eventName, properties);
      }
    }

    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, []);

  return null;
}
