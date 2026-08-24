"use client";

import { useState } from "react";
import { useReducedMotion } from "motion/react";

// One playful burst per fireKey change (null = armed but quiet). Pieces are
// pure CSS animation (confetti-pop in globals.css) and clean themselves up,
// so firing is as cheap as changing the key — RN port maps to reanimated.
const PIECES = [
  { left: "8%", color: "#54c400", delay: 0, tilt: -18 },
  { left: "16%", color: "#1cb0f6", delay: 120, tilt: 24 },
  { left: "26%", color: "#ffc800", delay: 40, tilt: -30 },
  { left: "36%", color: "#a568f5", delay: 180, tilt: 12 },
  { left: "46%", color: "#ff9600", delay: 80, tilt: -8 },
  { left: "54%", color: "#54c400", delay: 200, tilt: 30 },
  { left: "64%", color: "#1cb0f6", delay: 20, tilt: -22 },
  { left: "72%", color: "#ffc800", delay: 140, tilt: 16 },
  { left: "82%", color: "#a568f5", delay: 60, tilt: -14 },
  { left: "90%", color: "#ff9600", delay: 160, tilt: 26 },
  { left: "31%", color: "#c8ef44", delay: 220, tilt: -26 },
  { left: "59%", color: "#c8ef44", delay: 100, tilt: 20 },
] as const;

export function ConfettiBurst({
  fireKey,
  fireOnMount = false,
}: {
  fireKey: string | number | null;
  fireOnMount?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  // A burst celebrates a transition the viewer just caused. Without
  // fireOnMount, a fireKey that is already set when the component mounts
  // (page reload between rounds) stays quiet instead of replaying.
  // useState's initializer runs once, so this is the mount-time key.
  const [initialKey] = useState(fireKey);

  // No state: the animation runs once per key change and `forwards` parks
  // every piece at opacity 0, so finished bursts are invisible and inert.
  if (fireKey === null || reduceMotion) return null;
  if (!fireOnMount && fireKey === initialKey) return null;

  return (
    <div
      key={fireKey}
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 z-20 h-40 overflow-visible"
    >
      {PIECES.map((piece, index) => (
        <span
          key={index}
          className="confetti-piece"
          style={{
            left: piece.left,
            backgroundColor: piece.color,
            animationDelay: `${piece.delay}ms`,
            transform: `rotate(${piece.tilt}deg)`,
          }}
        />
      ))}
    </div>
  );
}
