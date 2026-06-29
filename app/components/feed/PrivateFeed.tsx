"use client";

import { useEffect, useState } from "react";
import { useNostrFeed } from "@/app/hooks/useNostr";
import { useFollows, getNsecPubkey } from "@/app/hooks/useFollows";
import { useNostrContext } from "@/app/components/NostrProvider";
import { useReplyCounts } from "@/app/hooks/useReplyCounts";
import { timeAgo } from "@/app/lib/timeAgo";
import PostReplies from "@/app/components/ui/PostReplies";
import ReplyButton from "@/app/components/ui/ReplyButton";
import PostBody from "@/app/components/ui/PostBody";
import UserMeta from "@/app/components/ui/UserMeta";
import type { Event } from "nostr-tools";

export default function PrivateFeed() {
  const { pool } = useNostrContext();
  const follows = useFollows((s) => s.follows);
  const loadFollows = useFollows((s) => s.loadFollows);
  const unfollow = useFollows((s) => s.unfollow);
  const { events, loadMore, loadingMore } = useNostrFeed({ kinds: [1], authors: follows, limit: 50 });
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
    <section className="h-full flex flex-col overflow-hidden">
      <h2 className="text-2xl font-semibold mb-6">Following</h2>
      {follows.length === 0 ? (
        <p className="text-sm text-[#2d2d2d]/50 font-[family-name:var(--font-inter)]">
          Not following anyone yet.
        </p>
      ) : (
        <ul className="space-y-8 overflow-y-auto flex-1 pr-2">
          {events.filter((e: Event) => follows.includes(e.pubkey)).map((event: Event) => (
            <li key={event.id} className="leading-relaxed">
              <div className="flex items-center justify-between gap-4 mb-2">
                <UserMeta pubkey={event.pubkey} />
                <button
                  onClick={() => handleUnfollow(event.pubkey)}
                  disabled={pending === event.pubkey}
                  className="shrink-0 bg-white text-[#2d2d2d] border border-[#2d2d2d] text-xs px-3 py-1 rounded font-[family-name:var(--font-inter)] hover:bg-[#f0f0ee] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {pending === event.pubkey ? "Unfollowing…" : "Unfollow"}
                </button>
              </div>
              <PostBody content={event.content} />
              <span className="text-sm text-[#2d2d2d]/50 mt-2 block font-[family-name:var(--font-inter)]">
                {new Date(event.created_at * 1000).toLocaleDateString("en-GB")} · {timeAgo(event.created_at)}
              </span>
              <div className="flex items-center justify-between mt-2">
                <PostReplies eventId={event.id} count={replyCounts.get(event.id) ?? 0} replyCounts={replyCounts} />
                <ReplyButton eventId={event.id} eventPubkey={event.pubkey} />
              </div>
            </li>
          ))}
          <li className="pt-4 pb-2">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full text-sm text-[#2d2d2d]/50 hover:text-[#2d2d2d] transition-colors font-[family-name:var(--font-inter)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          </li>
        </ul>
      )}
    </section>
  );
}
