import type { Event } from "nostr-tools";

// NIP-10 marker-aware: bepaalt op welk event dit event een directe reply is.
export function getReplyTarget(event: Event): string | null {
  const eTags = event.tags.filter((t) => t[0] === "e");
  if (eTags.length === 0) return null;
  const replyTag = eTags.find((t) => t[3] === "reply");
  if (replyTag) return replyTag[1];
  const rootTag = eTags.find((t) => t[3] === "root");
  if (rootTag) return rootTag[1];
  // legacy: laatste e-tag is de directe parent
  return eTags.at(-1)![1];
}
