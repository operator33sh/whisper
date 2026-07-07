"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useFollows, getNsecPubkey } from "@/app/hooks/useFollows";
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
  const [pending, setPending] = useState<string | null>(null);
  const myPubkey = getNsecPubkey();

  const [events, setEvents] = useState<Event[]>([]);
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const { counts: replyCounts } = useReplyCounts(events.map((e) => e.id));
  const [liveReplyCounts, setLiveReplyCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const feedRef = useRef<HTMLUListElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const activeRelaysKey = useRef<string>("");
  const eventsRef = useRef<Event[]>([]);
  const loadMoreRef = useRef<() => void>(() => {});
  const canLoadRef = useRef(false);
  const liveSubRef = useRef<{ close: () => void } | null>(null);
  const seenLiveReplies = useRef<Set<string>>(new Set());

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

  useEffect(() => {
    if (loadingFollows) return;
    if (follows.length === 0) { setLoading(false); return; }

    const relaysChanged = activeRelaysKey.current !== relays.join(",");

    // Full reset only when relay list changes
    if (relaysChanged) {
      activeRelaysKey.current = relays.join(",");
      setEvents([]);
      setLoading(true);
      setHasMore(true);
    }

    // Re-subscribe to full author set on every follows change
    const sub = pool.subscribeMany(relays, [{ kinds: [1], authors: follows, limit: 100 }], {
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

  useEffect(() => { eventsRef.current = events; }, [events]);
  useEffect(() => {
    canLoadRef.current = !loadingMore && hasMore && !loading && !loadingFollows;
  }, [loadingMore, hasMore, loading, loadingFollows]);

  // Live sub: picks up new replies to posts in the feed after initial load
  useEffect(() => {
    if (!relays.length || follows.length === 0) return;
    liveSubRef.current?.close();
    setLiveReplyCounts(new Map());
    seenLiveReplies.current = new Set();

    const since = Math.floor(Date.now() / 1000);
    liveSubRef.current = pool.subscribeMany(relays, [{ kinds: [1], since }], {
      onevent(event: Event) {
        if (!event.tags.some((t) => t[0] === "e")) return;
        if (seenLiveReplies.current.has(event.id)) return;
        seenLiveReplies.current.add(event.id);
        const eTag = event.tags.filter((t) => t[0] === "e").at(-1)?.[1];
        if (!eTag) return;
        if (!eventsRef.current.find((e) => e.id === eTag)) return;
        setLiveReplyCounts((prev) => {
          const next = new Map(prev);
          next.set(eTag, (next.get(eTag) ?? 0) + 1);
          return next;
        });
      },
    });

    return () => liveSubRef.current?.close();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, relays.join(","), follows.join(",")]);

  const loadMore = useCallback(() => {
    const oldest = eventsRef.current.at(-1);
    if (!oldest) return;

    setLoadingMore(true);
    let batchCount = 0;

    const sub = pool.subscribeMany(
      relays,
      [{ kinds: [1], authors: follows, until: oldest.created_at - 1, limit: 100 }],
      {
        onevent(event: Event) {
          batchCount++;
          setEvents((prev) => {
            if (prev.find((e) => e.id === event.id)) return prev;
            return [...prev, event].sort((a, b) => b.created_at - a.created_at);
          });
        },
        oneose() {
          if (batchCount === 0) setHasMore(false);
          setLoadingMore(false);
          sub.close();
        },
      }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, follows.join(","), relays.join(",")]);

  useEffect(() => { loadMoreRef.current = loadMore; }, [loadMore]);

  // Stabiele observer — nooit herschapen
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && canLoadRef.current) {
          loadMoreRef.current();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-fill: laad meer als de lijst het scherm niet vult
  useEffect(() => {
    if (loading || loadingMore || !hasMore || loadingFollows) return;
    const ul = feedRef.current;
    if (!ul || ul.scrollHeight > ul.clientHeight) return;
    loadMore();
  }, [loading, loadingMore, hasMore, loadingFollows, loadMore]);

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

  const displayEvents = events.filter((e: Event) => follows.includes(e.pubkey) && !e.tags.some(t => t[0] === 'e'));
  const showSpinner = displayEvents.length === 0 && (loadingFollows || follows.length > 0);

  return (
    <section className="h-full flex flex-col overflow-hidden">
      <header className="shrink-0 mb-6">
        <h2 className="text-xs uppercase tracking-widest text-[#2d2d2d]/40 font-[family-name:var(--font-inter)]">Following</h2>
        <p className="mt-1 text-sm text-[#2d2d2d]/50 font-[family-name:var(--font-inter)]">Posts from people you follow</p>
      </header>
      <div className="relative flex-1 overflow-hidden">
        {showSpinner && (
          <div className="absolute inset-0 flex items-start justify-center pt-8 pointer-events-none">
            <div className="w-6 h-6 rounded-full border-2 border-[#2d2d2d]/20 border-t-[#2d2d2d] animate-spin" />
          </div>
        )}
        <ul ref={feedRef} className="relative overflow-y-auto h-full pr-2">
          {displayEvents.map((event: Event) => {
            const isMinimized = event.tags.filter((t) => t[0] === "t").length > 8 && !expandedPosts.has(event.id);
            return (
              <li key={event.id} className="leading-relaxed bg-[#f9f9f7] pt-8 first:pt-0">
                <div className="flex items-center justify-between gap-4 mb-2">
                  <UserMeta pubkey={event.pubkey} />
                  {event.pubkey !== myPubkey && (
                    <button
                      onClick={() => handleUnfollow(event.pubkey)}
                      disabled={pending === event.pubkey}
                      className="shrink-0 bg-white text-[#2d2d2d] border border-[#2d2d2d] text-xs px-3 py-1 rounded font-[family-name:var(--font-inter)] hover:bg-[#f0f0ee] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {pending === event.pubkey ? "Unfollowing…" : "Unfollow"}
                    </button>
                  )}
                </div>
                {isMinimized ? (
                  <button
                    onClick={() => setExpandedPosts((prev) => new Set([...prev, event.id]))}
                    className="text-xs text-[#2d2d2d]/40 hover:text-[#2d2d2d] transition-colors font-[family-name:var(--font-inter)] mt-1"
                  >
                    Post minimalized +
                  </button>
                ) : (
                  <>
                    <PostBody
                      content={event.content}
                      timestamp={`${new Date(event.created_at * 1000).toLocaleDateString("en-GB")} · ${timeAgo(event.created_at)}`}
                      action={<ReplyButton eventId={event.id} eventPubkey={event.pubkey} />}
                    />
                    <PostReplies eventId={event.id} count={(replyCounts.get(event.id) ?? 0) + (liveReplyCounts.get(event.id) ?? 0)} replyCounts={replyCounts} />
                  </>
                )}
                <div className="mt-8 h-px bg-gradient-to-r from-transparent via-[#2d2d2d]/20 to-transparent" />
              </li>
            );
          })}
          <li>
            <div ref={sentinelRef} className="h-4" />
          </li>
        </ul>
      </div>
    </section>
  );
}
