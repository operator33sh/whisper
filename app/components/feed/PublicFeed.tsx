"use client";

import { useEffect, useRef, useState } from "react";
import { useNostrFeed } from "@/app/hooks/useNostr";
import { useFollows } from "@/app/hooks/useFollows";
import { useNostrContext } from "@/app/components/NostrProvider";
import PostBody from "@/app/components/ui/PostBody";
import UserMeta from "@/app/components/ui/UserMeta";
import { useReplyCounts } from "@/app/hooks/useReplyCounts";
import { timeAgo } from "@/app/lib/timeAgo";
import PostReplies from "@/app/components/ui/PostReplies";
import ReplyButton from "@/app/components/ui/ReplyButton";
import type { Event } from "nostr-tools";

export default function PublicFeed() {
  const { pool } = useNostrContext();
  const { events, loading, loadMore, loadingMore } = useNostrFeed({ kinds: [1], limit: 1000 });
  const reactions = useReplyCounts();
  const follows = useFollows((s) => s.follows);
  const follow = useFollows((s) => s.follow);
  const [pending, setPending] = useState<string | null>(null);
  const feedRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    function handleWheel(e: WheelEvent) {
      if (!feedRef.current) return;
      if (feedRef.current.contains(e.target as Node)) return;
      if (e.clientX >= window.innerWidth / 2) return;
      feedRef.current.scrollBy({ top: e.deltaY });
      e.preventDefault();
    }
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, []);

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
      (reactions.get(e.id) ?? 0) > 0 &&
      !e.tags.some(t => t[0] === 'e')
  );

  if (events.length > 0 && reactions.size > 0 && filtered.length === 0) {
    console.log("[PublicFeed] crosscheck miss — posts:", events.length, "reaction entries:", reactions.size);
    console.log("[PublicFeed] sample post id:", events[0].id);
    console.log("[PublicFeed] sample reaction key:", [...reactions.keys()][0]);
  }

  return (
    <section className="h-full flex flex-col overflow-hidden">
      <h2 className="text-2xl font-semibold mb-6">Feed</h2>
      {loading && (
        <div className="flex justify-center pt-8">
          <div className="w-6 h-6 rounded-full border-2 border-[#2d2d2d]/20 border-t-[#2d2d2d] animate-spin" />
        </div>
      )}
      <ul ref={feedRef} className="space-y-8 overflow-y-auto flex-1 pr-2">
        {filtered.map((event: Event) => (
          <li key={event.id} className="leading-relaxed">
            <div className="flex items-center justify-between gap-4 mb-2">
              <UserMeta pubkey={event.pubkey} />
              <button
                onClick={() => handleFollow(event.pubkey)}
                disabled={pending === event.pubkey}
                className="shrink-0 bg-black text-white text-xs px-3 py-1 rounded font-[family-name:var(--font-inter)] hover:bg-[#2d2d2d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pending === event.pubkey ? "Following…" : "Follow"}
              </button>
            </div>
            <PostBody
              content={event.content}
              timestamp={`${new Date(event.created_at * 1000).toLocaleDateString("en-GB")} · ${timeAgo(event.created_at)}`}
              action={<ReplyButton eventId={event.id} eventPubkey={event.pubkey} />}
            />
            <PostReplies eventId={event.id} count={reactions.get(event.id) ?? 0} replyCounts={reactions} />
          </li>
        ))}
        {!loading && (
          <li className="pt-4 pb-2">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full text-sm text-[#2d2d2d]/50 hover:text-[#2d2d2d] transition-colors font-[family-name:var(--font-inter)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          </li>
        )}
      </ul>
    </section>
  );
}
