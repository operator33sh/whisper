"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useFollows } from "@/app/hooks/useFollows";
import { useNostrContext } from "@/app/components/NostrProvider";
import { useReplyCounts } from "@/app/hooks/useReplyCounts";
import { timeAgo } from "@/app/lib/timeAgo";
import { RELAYS } from "@/app/lib/nostr";
import PostReplies from "@/app/components/ui/PostReplies";
import ReplyButton from "@/app/components/ui/ReplyButton";
import PostBody from "@/app/components/ui/PostBody";
import UserMeta from "@/app/components/ui/UserMeta";
import type { Event } from "nostr-tools";

export default function PrivateFeed() {
  const { pool } = useNostrContext();
  const follows = useFollows((s) => s.follows);
  const loadingFollows = useFollows((s) => s.loadingFollows);
  const unfollow = useFollows((s) => s.unfollow);
  const replyCounts = useReplyCounts();
  const [pending, setPending] = useState<string | null>(null);

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const subscribedAuthors = useRef<Set<string>>(new Set());
  const feedRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    function handleWheel(e: WheelEvent) {
      if (!feedRef.current) return;
      if (feedRef.current.contains(e.target as Node)) return;
      if (e.clientX < window.innerWidth / 2) return;
      feedRef.current.scrollBy({ top: e.deltaY });
      e.preventDefault();
    }
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, []);

  useEffect(() => {
    if (loadingFollows) return;

    const newAuthors = follows.filter((pk) => !subscribedAuthors.current.has(pk));
    if (newAuthors.length === 0) {
      setLoading(false);
      return;
    }

    const isInitialLoad = subscribedAuthors.current.size === 0;
    if (isInitialLoad) setLoading(true);

    newAuthors.forEach((pk) => subscribedAuthors.current.add(pk));

    const sub = pool.subscribeMany(RELAYS, [{ kinds: [1], authors: newAuthors, limit: 100 }], {
      onevent(event: Event) {
        setEvents((prev) => {
          if (prev.find((e) => e.id === event.id)) return prev;
          return [event, ...prev].sort((a, b) => b.created_at - a.created_at);
        });
      },
      oneose() {
        if (isInitialLoad) setLoading(false);
      },
    });

    return () => sub.close();
  }, [follows, loadingFollows, pool]);

  const loadMore = useCallback(() => {
    setEvents((current) => {
      const oldest = current.at(-1);
      if (!oldest) return current;

      setLoadingMore(true);
      const authors = [...subscribedAuthors.current];

      const sub = pool.subscribeMany(
        RELAYS,
        [{ kinds: [1], authors, until: oldest.created_at - 1, limit: 100 }],
        {
          onevent(event: Event) {
            setEvents((prev) => {
              if (prev.find((e) => e.id === event.id)) return prev;
              return [...prev, event].sort((a, b) => b.created_at - a.created_at);
            });
          },
          oneose() {
            setLoadingMore(false);
            sub.close();
          },
        }
      );

      return current;
    });
  }, [pool]);

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

  return (
    <section className="h-full flex flex-col overflow-hidden">
      <h2 className="text-2xl font-semibold mb-6">Following</h2>
      {(loadingFollows || loading) ? (
        <div className="flex justify-center pt-8">
          <div className="w-6 h-6 rounded-full border-2 border-[#2d2d2d]/20 border-t-[#2d2d2d] animate-spin" />
        </div>
      ) : (
        <ul ref={feedRef} className="space-y-8 overflow-y-auto flex-1 pr-2">
          {events.filter((e: Event) => follows.includes(e.pubkey) && !e.tags.some(t => t[0] === 'e')).map((event: Event) => (
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
              <PostBody
                content={event.content}
                timestamp={`${new Date(event.created_at * 1000).toLocaleDateString("en-GB")} · ${timeAgo(event.created_at)}`}
              />
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
