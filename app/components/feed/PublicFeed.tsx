"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useFollows, getNsecPubkey } from "@/app/hooks/useFollows";
import { useNostrContext } from "@/app/components/NostrProvider";
import { useRelays } from "@/app/hooks/useRelays";
import PostBody from "@/app/components/ui/PostBody";
import UserMeta from "@/app/components/ui/UserMeta";
import { timeAgo } from "@/app/lib/timeAgo";
import PostReplies from "@/app/components/ui/PostReplies";
import ReplyButton from "@/app/components/ui/ReplyButton";
import type { Event } from "nostr-tools";

const BATCH = 200;

export default function PublicFeed() {
  const { pool } = useNostrContext();
  const relays = useRelays((s) => s.relays);
  const follows = useFollows((s) => s.follows);
  const follow = useFollows((s) => s.follow);
  const [pending, setPending] = useState<string | null>(null);
  const myPubkey = getNsecPubkey();

  const [posts, setPosts] = useState<Event[]>([]);
  const [replyCounts, setReplyCounts] = useState<Map<string, number>>(new Map());
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const feedRef = useRef<HTMLUListElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const postsRef = useRef<Event[]>([]);
  const replySubRef = useRef<{ close: () => void } | null>(null);
  const seenReplies = useRef<Set<string>>(new Set());
  const allPostIds = useRef<Set<string>>(new Set());
  const canLoadRef = useRef(false);
  const loadMoreRef = useRef<() => void>(() => {});

  useEffect(() => { postsRef.current = posts; }, [posts]);
  useEffect(() => {
    canLoadRef.current = !loadingMore && hasMore && !loadingPosts;
  }, [loadingMore, hasMore, loadingPosts]);

  // Reopen reply-count sub with all accumulated post IDs
  function openReplyCountSub() {
    const ids = Array.from(allPostIds.current);
    if (ids.length === 0) return;
    replySubRef.current?.close();

    const CHUNK = 200;
    const filters = [];
    for (let i = 0; i < ids.length; i += CHUNK) {
      filters.push({ kinds: [1], "#e": ids.slice(i, i + CHUNK) });
    }

    const sub = pool.subscribeMany(relays, filters, {
      onevent(event: Event) {
        if (seenReplies.current.has(event.id)) return;
        seenReplies.current.add(event.id);
        const eTag = event.tags.filter((t) => t[0] === "e").at(-1)?.[1];
        if (!eTag) return;
        setReplyCounts((prev) => {
          const next = new Map(prev);
          next.set(eTag, (next.get(eTag) ?? 0) + 1);
          return next;
        });
      },
    });
    replySubRef.current = sub;
  }

  // Load a batch of posts (oldest.created_at - 1 as until for pagination)
  function loadBatch(until?: number) {
    const filter: Record<string, unknown> = { kinds: [1], limit: BATCH };
    if (until) filter.until = until;

    let totalFromRelay = 0;
    const sub = pool.subscribeMany(relays, [filter as Parameters<typeof pool.subscribeMany>[1][0]], {
      onevent(event: Event) {
        totalFromRelay++;
        if (event.tags.some((t) => t[0] === "e")) return; // skip replies
        allPostIds.current.add(event.id);
        setPosts((prev) => {
          if (prev.find((e) => e.id === event.id)) return prev;
          return [...prev, event].sort((a, b) => b.created_at - a.created_at);
        });
      },
      oneose() {
        if (totalFromRelay === 0) setHasMore(false);
        sub.close();
        openReplyCountSub();
        if (until) setLoadingMore(false);
        else setLoadingPosts(false);
      },
    });
  }

  // Initial load
  useEffect(() => {
    setLoadingPosts(true);
    setPosts([]);
    setReplyCounts(new Map());
    setHasMore(true);
    replySubRef.current?.close();
    seenReplies.current = new Set();
    allPostIds.current = new Set();
    loadBatch();

    return () => { replySubRef.current?.close(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, relays.join(",")]);

  const loadMore = useCallback(() => {
    const oldest = postsRef.current.at(-1);
    if (!oldest) return;
    setLoadingMore(true);
    loadBatch(oldest.created_at - 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, relays.join(",")]);

  useEffect(() => { loadMoreRef.current = loadMore; }, [loadMore]);

  // Scroll-triggered infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && canLoadRef.current) loadMoreRef.current(); },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-fill when filtered list doesn't fill screen
  useEffect(() => {
    if (loadingPosts || loadingMore || !hasMore) return;
    const ul = feedRef.current;
    if (!ul || ul.scrollHeight > ul.clientHeight) return;
    loadMore();
  }, [loadingPosts, loadingMore, hasMore, loadMore]);

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

  async function handleFollow(pubkey: string) {
    setPending(pubkey);
    try { await follow(pool, pubkey); }
    catch (e) { console.error("[PublicFeed] follow failed:", e); }
    finally { setPending(null); }
  }

  const filtered = posts.filter(
    (e) => e.pubkey !== myPubkey && !follows.includes(e.pubkey) && (replyCounts.get(e.id) ?? 0) > 0
  );

  return (
    <section className="h-full flex flex-col overflow-hidden">
      <header className="shrink-0 mb-6">
        <h2 className="text-xs uppercase tracking-widest text-[#2d2d2d]/40 font-[family-name:var(--font-inter)]">Feed</h2>
        <p className="mt-1 text-sm text-[#2d2d2d]/50 font-[family-name:var(--font-inter)]">Discover posts from the network</p>
      </header>
      <div className="relative flex-1 overflow-hidden">
        {(loadingPosts || filtered.length === 0) && (
          <div className="absolute inset-0 flex items-start justify-center pt-8 pointer-events-none">
            <div className="w-6 h-6 rounded-full border-2 border-[#2d2d2d]/20 border-t-[#2d2d2d] animate-spin" />
          </div>
        )}
        <ul ref={feedRef} className="relative overflow-y-auto h-full pr-2">
          {filtered.map((event) => (
            <li key={event.id} className="leading-relaxed bg-[#f9f9f7] pt-8 first:pt-0">
              <div className="flex items-center justify-between gap-4 mb-2">
                <UserMeta pubkey={event.pubkey} />
                {event.pubkey !== myPubkey && (
                  <button
                    onClick={() => handleFollow(event.pubkey)}
                    disabled={pending === event.pubkey}
                    className="shrink-0 bg-black text-white text-xs px-3 py-1 rounded font-[family-name:var(--font-inter)] hover:bg-[#2d2d2d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {pending === event.pubkey ? "Following…" : "Follow"}
                  </button>
                )}
              </div>
              <PostBody
                content={event.content}
                timestamp={`${new Date(event.created_at * 1000).toLocaleDateString("en-GB")} · ${timeAgo(event.created_at)}`}
                action={<ReplyButton eventId={event.id} eventPubkey={event.pubkey} />}
              />
              <PostReplies eventId={event.id} count={replyCounts.get(event.id) ?? 0} replyCounts={replyCounts} />
              <div className="mt-8 h-px bg-gradient-to-r from-transparent via-[#2d2d2d]/20 to-transparent" />
            </li>
          ))}
          <li><div ref={sentinelRef} className="h-4" /></li>
        </ul>
      </div>
    </section>
  );
}
