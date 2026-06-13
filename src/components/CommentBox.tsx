"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { addComment, deleteComment } from "@/app/social/actions";

export interface CommentItem {
  id: string;
  user_id: string;
  body: string;
  name: string;
}

/**
 * Reacties met directe (optimistische) plaatsing/verwijdering — geen volledige
 * paginaherlaad meer bij elke reactie, dus geen merkbare vertraging.
 */
export function CommentBox({
  sessionId,
  currentUserId,
  currentUserName,
  initial,
  labels,
}: {
  sessionId: string;
  currentUserId: string | null;
  currentUserName: string;
  initial: CommentItem[];
  labels: {
    comments: string;
    placeholder: string;
    send: string;
    none: string;
    delete: string;
  };
}) {
  const [comments, setComments] = useState<CommentItem[]>(initial);
  const [text, setText] = useState("");
  const [, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || !currentUserId) return;
    const tempId = `temp-${Date.now()}`;
    setComments((c) => [
      ...c,
      { id: tempId, user_id: currentUserId, body, name: currentUserName },
    ]);
    setText("");
    try {
      navigator.vibrate?.(12);
    } catch {}
    const fd = new FormData();
    fd.set("session_id", sessionId);
    fd.set("body", body);
    startTransition(async () => {
      const realId = await addComment(fd);
      if (realId) {
        setComments((c) => c.map((x) => (x.id === tempId ? { ...x, id: realId } : x)));
      }
    });
  }

  function remove(id: string) {
    setComments((c) => c.filter((x) => x.id !== id));
    const fd = new FormData();
    fd.set("id", id);
    startTransition(() => {
      void deleteComment(fd);
    });
  }

  return (
    <>
      <h2 className="mb-2 mt-6 font-semibold">{labels.comments}</h2>
      <form onSubmit={submit} className="mb-4 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          placeholder={labels.placeholder}
          className="flex-1 rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-sm placeholder:text-faint focus:border-primary focus:outline-none"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-fg transition hover:brightness-110 disabled:opacity-50"
        >
          {labels.send}
        </button>
      </form>

      {comments.length === 0 ? (
        <p className="text-sm text-faint">{labels.none}</p>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link href={`/u/${c.user_id}`} className="text-sm font-medium hover:text-primary">
                  {c.name}
                </Link>
                <p className="text-sm text-muted">{c.body}</p>
              </div>
              {c.user_id === currentUserId && !c.id.startsWith("temp-") && (
                <button
                  type="button"
                  onClick={() => remove(c.id)}
                  className="shrink-0 text-xs text-faint hover:text-danger"
                >
                  {labels.delete}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
