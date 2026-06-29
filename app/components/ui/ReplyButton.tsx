"use client";

import { useState } from "react";
import { useNostrContext } from "@/app/components/NostrProvider";
import { RELAYS } from "@/app/lib/nostr";
import { finalizeEvent } from "nostr-tools";
import { decode } from "nostr-tools/nip19";

const STORAGE_KEY = "whisper:nsec";

interface Props {
  eventId: string;
  eventPubkey: string;
}

export default function ReplyButton({ eventId, eventPubkey }: Props) {
  const { pool } = useNostrContext();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const nsec = localStorage.getItem(STORAGE_KEY);
    if (!nsec) { setError("Not logged in"); return; }

    const { type, data: privateKey } = decode(nsec);
    if (type !== "nsec") { setError("Invalid nsec"); return; }

    const content = text.trim();
    if (!content) return;

    setSending(true);
    setError(null);

    try {
      const event = finalizeEvent(
        {
          kind: 1,
          created_at: Math.floor(Date.now() / 1000),
          tags: [["e", eventId], ["p", eventPubkey]],
          content,
        },
        privateKey as Uint8Array
      );

      await Promise.any(pool.publish(RELAYS, event));
      setText("");
      setOpen(false);
    } catch (e) {
      console.error("[ReplyButton] publish failed:", e);
      setError("Failed to send. Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-[#2d2d2d]/50 hover:text-[#2d2d2d] transition-colors font-[family-name:var(--font-inter)]"
      >
        Reply
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#f9f9f7] rounded-lg p-8 w-full max-w-md flex flex-col gap-4">
            <h2 className="text-xl font-semibold">Reply</h2>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write your reply…"
              rows={4}
              className="w-full border border-[#2d2d2d]/30 rounded px-4 py-2 text-sm font-[family-name:var(--font-inter)] bg-white focus:outline-none focus:border-[#2d2d2d] resize-none"
            />
            {error && (
              <span className="text-red-500 text-xs font-[family-name:var(--font-inter)]">{error}</span>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setOpen(false); setError(null); }}
                className="text-sm px-4 py-2 font-[family-name:var(--font-inter)] text-[#2d2d2d]/60 hover:text-[#2d2d2d] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={sending || !text.trim()}
                className="bg-black text-white text-sm px-4 py-2 rounded font-[family-name:var(--font-inter)] hover:bg-[#2d2d2d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? "Sending…" : "Whisper"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
