"use client";

import { useEffect, useState } from "react";
import { decode } from "nostr-tools/nip19";
import { useNostrContext } from "@/app/components/NostrProvider";
import { useRelays } from "@/app/hooks/useRelays";
import UserMeta from "@/app/components/ui/UserMeta";
import PostContent from "@/app/components/ui/PostContent";
import type { Event } from "nostr-tools";

export default function NeventEmbed({ raw }: { raw: string }) {
  const { pool } = useNostrContext();
  const relays = useRelays((s) => s.relays);
  const [event, setEvent] = useState<Event | null>(null);
  const [failed, setFailed] = useState(false);

  let eventId: string | null = null;
  let relayHints: string[] = [];
  try {
    const encoded = raw.replace("nostr:", "");
    const { type, data } = decode(encoded);
    if (type === "nevent") {
      eventId = (data as { id: string; relays?: string[] }).id;
      relayHints = (data as { id: string; relays?: string[] }).relays ?? [];
    } else if (type === "note") {
      eventId = data as string;
    }
  } catch {
    // fallthrough
  }

  useEffect(() => {
    if (!eventId) return;
    const allRelays = [...new Set([...relays, ...relayHints])];
    let found = false;
    const sub = pool.subscribeMany(allRelays, [{ ids: [eventId], kinds: [1], limit: 1 }], {
      onevent(e: Event) {
        found = true;
        setEvent(e);
        sub.close();
      },
      oneose() {
        if (!found) setFailed(true);
        sub.close();
      },
    });
    return () => sub.close();
  }, [eventId]);

  if (!eventId) return <span className="text-[#2d2d2d]/40 text-sm">{raw}</span>;
  if (failed) return <span className="text-[#2d2d2d]/40 text-sm italic">quoted post not found</span>;
  if (!event) return <span className="text-[#2d2d2d]/40 text-sm italic">loading…</span>;

  const hasMedia = /https?:\/\/\S+\.(?:jpg|jpeg|png|gif|webp|avif|mp4|webm|mov|ogg)(?:\?\S*)?/i.test(event.content);

  return (
    <blockquote className="border border-[#2d2d2d]/15 rounded px-3 pt-2 pb-3 my-1 text-sm text-[#2d2d2d]/75 bg-[#2d2d2d]/[0.02]">
      <div className="mb-1">
        <UserMeta pubkey={event.pubkey} />
      </div>
      <div className={!hasMedia ? "overflow-hidden max-h-40" : undefined}>
        <PostContent content={event.content} />
      </div>
    </blockquote>
  );
}
