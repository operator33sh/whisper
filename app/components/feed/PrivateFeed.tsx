"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useFollows } from "@/app/hooks/useFollows";
import { useNostrContext } from "@/app/components/NostrProvider";
import { useReplyCounts } from "@/app/hooks/useReplyCounts";
import { timeAgo } from "@/app/lib/timeAgo";
import { useRelays } from "@/app/hooks/useRelays";
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
  const relays = useRelays((s) => s.relays);
  const replyCounts = useReplyCounts();
  const [pending, setPending] = useState<string | null>(null);

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const feedRef = useRef<HTMLUListElement>(null);
  const subscribedAuthors = useRef<Set<string>>(new Set());
  const activeRelaysKey = useRef<string>("");

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
    if (follows.length === 0) { setLoading(false); return; }

    const relaysChanged = activeRelaysKey.current !== relays.join(",");

    // Full reset only when relay list changes
    if (relaysChanged) {
      activeRelaysKey.current = relays.join(",");
      subscribedAuthors.current = new Set();
      setEvents([]);
      setLoading(true);
    }

    // Only fetch authors not yet subscribed to
    const newAuthors = follows.filter((pk) => !subscribedAuthors.current.has(pk));
    if (newAuthors.length === 0) { setLoading(false); return; }
    newAuthors.forEach((pk) => subscribedAuthors.current.add(pk));

    const sub = pool.subscribeMany(relays, [{ kinds: [1], authors: newAuthors, limit: 100 }], {
      onevent(event: Event) {
        setEvents((prev) => {
          if (prev.find((e) => e.id === event.id)) return prev;
          return [event, ...prev].sort((a, b) => b.created_at - a.created_at);
        });
      },
      oneose() {
        setLoading(false);
      },
    });

    return () => sub.close();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [follows.join(","), loadingFollows, pool, relays.join(",")]);

  const loadMore = useCallback(() => {
    setEvents((current) => {
      const oldest = current.at(-1);
      if (!oldest) return current;

      setLoadingMore(true);

      const sub = pool.subscribeMany(
        relays,
        [{ kinds: [1], authors: follows, until: oldest.created_at - 1, limit: 100 }],
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, follows.join(","), relays.join(",")]);

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
      <div className="relative flex-1 overflow-hidden">
        {(loadingFollows || loading) && (
          <div className="absolute inset-0 flex items-start justify-center pt-8 pointer-events-none">
            <div className="w-6 h-6 rounded-full border-2 border-[#2d2d2d]/20 border-t-[#2d2d2d] animate-spin" />
          </div>
        )}
        <ul ref={feedRef} className="relative space-y-8 overflow-y-auto h-full pr-2">
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
                action={<ReplyButton eventId={event.id} eventPubkey={event.pubkey} />}
              />
              <PostReplies eventId={event.id} count={replyCounts.get(event.id) ?? 0} replyCounts={replyCounts} />
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
      </div>
    </section>
  );
}
