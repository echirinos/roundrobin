import type { SVGProps } from "react";

/**
 * PlaySync's own icon set — drawn for this product, not pulled from a library.
 *
 * Shape language: 24px grid, 1.75 stroke, round caps, and court geometry
 * wherever it's honest — rectangles with a center line are courts, dots are
 * balls, and the small solid dot doubles as the brand's "live" mark. Icons
 * inherit `currentColor`; the optional accent path uses `text-live` where a
 * second voice is earned.
 */

type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps) {
  return {
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...props,
  };
}

/** Arrow — a served ball's flat trajectory, not a generic chevron shaft. */
export function IconArrowRight(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 12h14" />
      <path d="M13 6.5 19 12l-6 5.5" />
    </svg>
  );
}

/** Check inside a court corner — a call that's been made. */
export function IconCheck(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 13.2 9 18 20 6.5" />
      <path d="M4 6.5V4.5h2" opacity={0.45} />
    </svg>
  );
}

/** Roster — a clipboard reduced to its paper and lines. */
export function IconRoster(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="5" y="4" width="14" height="17" rx="2.5" />
      <path d="M9 2.75h6" />
      <path d="M8.75 9.5h6.5M8.75 13h6.5M8.75 16.5h3.5" />
    </svg>
  );
}

/** Link — two court halves joined at the net line. */
export function IconLink(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9.5 7H7a5 5 0 0 0 0 10h2.5" />
      <path d="M14.5 7H17a5 5 0 0 1 0 10h-2.5" />
      <path d="M8.5 12h7" />
    </svg>
  );
}

/** Fewer texts — a speech bubble, calmly set down. */
export function IconQuietChat(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M20 11.4c0 3.8-3.6 6.6-8 6.6-1 0-2-.14-2.9-.4L4 19l1.5-3.2C4.56 14.6 4 13.1 4 11.4 4 7.6 7.6 4.8 12 4.8s8 2.8 8 6.6Z" />
      <path d="M9 11.5h.01M12 11.5h.01M15 11.5h.01" strokeWidth={2.4} />
    </svg>
  );
}

/** QR — finder squares plus one live dot where the code "beats". */
export function IconQr(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
      <path d="M13.5 14.5v-1h1M19 13.5h1v1M20 19v1h-1M14.5 20h-1v-1" />
      <circle cx="16.75" cy="16.75" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Re-run — the rotation players actually make between games. */
export function IconRotate(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5.5 8.5a7 7 0 0 1 12.6-.9" />
      <path d="M18.5 4v4h-4" />
      <path d="M18.5 15.5a7 7 0 0 1-12.6.9" />
      <path d="M5.5 20v-4h4" />
    </svg>
  );
}

/** Scan — a QR being read at the fence: brackets and the sweep line. */
export function IconScan(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
      <path d="M5.5 12h13" className="text-live" stroke="currentColor" />
    </svg>
  );
}

/** Phone — the organizer's whole toolkit. */
export function IconPhone(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="7" y="3" width="10" height="18" rx="2.5" />
      <path d="M10.5 5h3" opacity={0.45} />
      <circle cx="12" cy="17.4" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Trophy — cup on a court baseline. */
export function IconTrophy(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
      <path d="M8 5.5H5.5a2.5 2.5 0 0 0 2.6 2.9M16 5.5h2.5a2.5 2.5 0 0 1-2.6 2.9" />
      <path d="M12 13v3.5" />
      <path d="M8.5 20h7M12 16.5v0" />
    </svg>
  );
}

/** Instant — a paddle-strike spark, not the stock bolt. */
export function IconSpark(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M13.5 3 6 13.5h5L10.5 21 18 10.5h-5L13.5 3Z" />
    </svg>
  );
}

export const brandIcons = {
  arrowRight: IconArrowRight,
  check: IconCheck,
  roster: IconRoster,
  link: IconLink,
  quietChat: IconQuietChat,
  qr: IconQr,
  rotate: IconRotate,
  scan: IconScan,
  phone: IconPhone,
  trophy: IconTrophy,
  spark: IconSpark,
};
