// The PlaySync mascot: a pickleball with a sweatband. One flat-SVG file so a
// future React Native port maps to react-native-svg 1:1. Band color and
// expression vary per character; the face stays clear of the holes.

export function MascotArt({
  band = "#ff9600",
  expression = "smile",
}: {
  band?: string;
  expression?: "smile" | "open";
}) {
  return (
    <>
      <circle cx="100" cy="100" r="88" fill="#c8ef44" stroke="#8ab818" strokeWidth="7" />
      <circle cx="58" cy="52" r="9" fill="#a5cc2e" />
      <circle cx="100" cy="38" r="9" fill="#a5cc2e" />
      <circle cx="142" cy="52" r="9" fill="#a5cc2e" />
      <circle cx="164" cy="92" r="9" fill="#a5cc2e" />
      <circle cx="36" cy="92" r="9" fill="#a5cc2e" />
      <path
        d="M28 78c14-26 42-42 72-42s58 16 72 42"
        stroke={band}
        strokeWidth="16"
        strokeLinecap="round"
      />
      <g className="mascot-blink">
        <ellipse cx="76" cy="110" rx="13" ry="16" fill="#ffffff" />
        <ellipse cx="124" cy="110" rx="13" ry="16" fill="#ffffff" />
        <circle cx="79" cy="113" r="6.5" fill="#243325" />
        <circle cx="121" cy="113" r="6.5" fill="#243325" />
      </g>
      {expression === "smile" ? (
        <path
          d="M82 146c6 7 12 10 18 10s12-3 18-10"
          stroke="#243325"
          strokeWidth="7"
          strokeLinecap="round"
        />
      ) : (
        <>
          <ellipse cx="100" cy="150" rx="15" ry="12" fill="#243325" />
          <ellipse cx="100" cy="155" rx="8" ry="5" fill="#ff8a7a" />
        </>
      )}
      <circle cx="58" cy="138" r="8" fill="#ffb14d" opacity="0.55" />
      <circle cx="142" cy="138" r="8" fill="#ffb14d" opacity="0.55" />
    </>
  );
}

export function MascotBall({
  size = 200,
  band,
  expression,
  medal = false,
}: {
  size?: number;
  band?: string;
  expression?: "smile" | "open";
  medal?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size * 1.04}
      viewBox="0 0 200 208"
      fill="none"
      aria-hidden="true"
    >
      <ellipse cx="100" cy="199" rx="62" ry="8" fill="#243325" opacity="0.08" />
      <MascotArt band={band} expression={expression} />
      {medal && (
        <g>
          {/* ribbon draped from the sides down to the medal */}
          <path d="M40 132l52 52M160 132l-52 52" stroke="#1cb0f6" strokeWidth="13" strokeLinecap="round" />
          <circle cx="104" cy="184" r="20" fill="#ffc800" stroke="#e0a500" strokeWidth="4" />
          <path
            d="M104 174l3.2 6.6 7.3 1-5.3 5.1 1.3 7.2-6.5-3.4-6.5 3.4 1.3-7.2-5.3-5.1 7.3-1z"
            fill="#e0a500"
          />
        </g>
      )}
    </svg>
  );
}

// A tiny peeking mascot for colored headers — just the top arc of the ball.
export function MascotPeek({ width = 92 }: { width?: number }) {
  return (
    <svg
      width={width}
      height={width * 0.56}
      viewBox="0 0 200 112"
      fill="none"
      aria-hidden="true"
    >
      <MascotArt />
    </svg>
  );
}
