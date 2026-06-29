"use client";

import { useState } from "react";
import { useNostrFeed } from "@/app/hooks/useNostr";
import { useFollows } from "@/app/hooks/useFollows";
import { useNostrContext } from "@/app/components/NostrProvider";
import Avatar from "@/app/components/ui/Avatar";
import PostContent from "@/app/components/ui/PostContent";
import { npubEncode } from "nostr-tools/nip19";
import { useReplyCounts } from "@/app/hooks/useReplyCounts";
import { timeAgo } from "@/app/lib/timeAgo";
import PostReplies from "@/app/components/ui/PostReplies";
import type { Event } from "nostr-tools";

export default function PublicFeed() {
  const { pool } = useNostrContext();
  const events = useNostrFeed({ kinds: [1], limit: 1000 });
  const reactions = useReplyCounts();
  const follows = useFollows((s) => s.follows);
  const follow = useFollows((s) => s.follow);
  const [pending, setPending] = useState<string | null>(null);

  async function handleFollow(pubkey: string) {
    setPending(pubkey);
    try {
      await follow(pool, pubkey);
    } catch (e) {
      console.error("[PublicFeed] follow failed:", e);
    } finally {
      setPending(null);
    }
  }

  const filtered = events.filter(
    (e: Event) =>
      !follows.includes(e.pubkey) &&
      (reactions.get(e.id) ?? 0) > 0
  );

  if (events.length > 0 && reactions.size > 0 && filtered.length === 0) {
    console.log("[PublicFeed] crosscheck miss — posts:", events.length, "reaction entries:", reactions.size);
    console.log("[PublicFeed] sample post id:", events[0].id);
    console.log("[PublicFeed] sample reaction key:", [...reactions.keys()][0]);
  }

  return (
    <section>
      <h2 className="text-2xl font-semibold mb-6">Feed</h2>
      <ul className="space-y-8">
        {filtered.map((event: Event) => (
          <li key={event.id} className="leading-relaxed">
            <div className="flex items-center gap-3 mb-2">
              <Avatar pubkey={event.pubkey} />
              <span className="text-sm text-[#2d2d2d]/40 truncate font-[family-name:var(--font-inter)]">
                {npubEncode(event.pubkey)}
              </span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <PostContent content={event.content} />
              <button
                onClick={() => handleFollow(event.pubkey)}
                disabled={pending === event.pubkey}
                className="shrink-0 bg-black text-white text-xs px-3 py-1 rounded font-[family-name:var(--font-inter)] hover:bg-[#2d2d2d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pending === event.pubkey ? "Following…" : "Follow"}
              </button>
            </div>
            <span className="text-sm text-[#2d2d2d]/50 mt-2 block font-[family-name:var(--font-inter)]">
              {new Date(event.created_at * 1000).toLocaleDateString("en-GB")} · {timeAgo(event.created_at)}
            </span>
            <PostReplies eventId={event.id} count={reactions.get(event.id) ?? 0} />
          </li>
        ))}
      </ul>
    </section>
  );
}
