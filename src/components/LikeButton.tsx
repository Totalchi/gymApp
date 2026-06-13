"use client";

import { useState, useTransition } from "react";
import { toggleLike } from "@/app/social/actions";

/** Like-knop met directe (optimistische) reactie — geen volledige feed-herlaad. */
export function LikeButton({
  sessionId,
  liked: initialLiked,
  count: initialCount,
}: {
  sessionId: string;
  liked: boolean;
  count: number;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [, startTransition] = useTransition();

  function onClick() {
    const next = !liked;
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));
    try {
      navigator.vibrate?.(12);
    } catch {}
    const fd = new FormData();
    fd.set("session_id", sessionId);
    startTransition(() => {
      void toggleLike(fd);
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1 transition active:scale-95 ${
        liked ? "text-rose-400" : "text-muted hover:text-rose-400"
      }`}
    >
      <span className={liked ? "animate-pop" : ""}>{liked ? "♥" : "♡"}</span> {count}
    </button>
  );
}
