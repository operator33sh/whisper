"use client";

import { useEffect, useState } from "react";
import { useNostrFeed } from "@/app/hooks/useNostr";
import { useFollows, getNsecPubkey } from "@/app/hooks/useFollows";
import { useNostrContext } from "@/app/components/NostrProvider";
import { useReplyCounts } from "@/app/hooks/useReplyCounts";
import { timeAgo } from "@/app/lib/timeAgo";
import PostReplies from "@/app/components/ui/PostReplies";
import Avatar from "@/app/components/ui/Avatar";
import PostContent from "@/app/components/ui/PostContent";
import { npubEncode } from "nostr-tools/nip19";
import type { Event } from "nostr-tools";

export default function PrivateFeed() {
  const { pool } = useNostrContext();
  const follows = useFollows((s) => s.follows);
  const loadFollows = useFollows((s) => s.loadFollows);
  const unfollow = useFollows((s) => s.unfollow);
  const events = useNostrFeed({ kinds: [1], authors: follows, limit: 50 });
  const replyCounts = useReplyCounts();
  const [pending, setPending] = useState<string | null>(null);

  async function handleUnfollow(pubkey: string) {
    setPending(pubkey);
    try {
      await unfollow(pool, pubkey);
    } catch (e) {
      console.error("[PrivateFeed] unfollow failed:", e);
    } finally {
      setPending(null);
    }
  }

  useEffect(() => {
    const pubkey = getNsecPubkey();
    if (!pubkey) {
      console.warn("[PrivateFeed] no valid nsec in localStorage, cannot load follows");
      return;
    }
    loadFollows(pool, pubkey);
  }, [pool, loadFollows]);

  return (
    <section>
      <h2 className="text-2xl font-semibold mb-6">Following</h2>
      {follows.length === 0 ? (
        <p className="text-sm text-[#2d2d2d]/50 font-[family-name:var(--font-inter)]">
          Not following anyone yet.
        </p>
      ) : (
        <ul className="space-y-8">
          {events.filter((e: Event) => follows.includes(e.pubkey)).map((event: Event) => (
            <li key={event.id} className="leading-relaxed">
              <div className="flex items-center justify-between gap-4 mb-2">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar pubkey={event.pubkey} />
                  <span className="text-sm text-[#2d2d2d]/40 truncate font-[family-name:var(--font-inter)]">
                    {npubEncode(event.pubkey)}
                  </span>
                </div>
                <button
                  onClick={() => handleUnfollow(event.pubkey)}
                  disabled={pending === event.pubkey}
                  className="shrink-0 bg-white text-[#2d2d2d] border border-[#2d2d2d] text-xs px-3 py-1 rounded font-[family-name:var(--font-inter)] hover:bg-[#f0f0ee] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {pending === event.pubkey ? "Unfollowing…" : "Unfollow"}
                </button>
              </div>
              <PostContent content={event.content} />
              <span className="text-sm text-[#2d2d2d]/50 mt-2 block font-[family-name:var(--font-inter)]">
                {new Date(event.created_at * 1000).toLocaleDateString("en-GB")} · {timeAgo(event.created_at)}
              </span>
              <PostReplies eventId={event.id} count={replyCounts.get(event.id) ?? 0} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
