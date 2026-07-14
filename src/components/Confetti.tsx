"use client";

import { useEffect, useState } from "react";

const COLORS = ["#60a5fa", "#f59e0b", "#10b981", "#fb7185", "#38bdf8", "#a78bfa"];

/** Korte confetti-burst + trilling. Render met `fire` om af te vuren. */
export function Confetti({ fire }: { fire: boolean }) {
  const [pieces] = useState(() =>
    Array.from({ length: 44 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.4,
      dur: 1.8 + Math.random() * 1.4,
      rot: Math.random() * 360,
      color: COLORS[i % COLORS.length],
      size: 6 + Math.random() * 6,
    })),
  );

  useEffect(() => {
    if (fire) {
      try {
        navigator.vibrate?.([60, 40, 90]);
      } catch {}
    }
  }, [fire]);

  if (!fire) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            top: "-12px",
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: 2,
            transform: `rotate(${p.rot}deg)`,
            animation: `confetti-fall ${p.dur}s ${p.delay}s ease-in forwards`,
          }}
        />
      ))}
    </div>
  );
}
