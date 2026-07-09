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

const BATCH = 50;

export default function HashtagFeed({ tag, scrollable = true }: { tag: string; scrollable?: boolean }) {
  const { pool } = useNostrContext();
  const relays = useRelays((s) => s.relays);
  const follows = useFollows((s) => s.follows);
  const follow = useFollows((s) => s.follow);
  const myPubkey = getNsecPubkey();
  const [pending, setPending] = useState<string | null>(null);

  const [posts, setPosts] = useState<Event[]>([]);
  const [replyCounts, setReplyCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const feedRef = useRef<HTMLUListElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const postsRef = useRef<Event[]>([]);
  const replySubsRef = useRef<Array<{ close: () => void }>>([]);
  const liveSubRef = useRef<{ close: () => void } | null>(null);
  const seenReplies = useRef<Set<string>>(new Set());
  const canLoadRef = useRef(false);
  const loadMoreRef = useRef<() => void>(() => {});
  const seenIds = useRef<Set<string>>(new Set());

  useEffect(() => { postsRef.current = posts; }, [posts]);
  useEffect(() => {
    canLoadRef.current = !loadingMore && hasMore && !loading;
  }, [loadingMore, hasMore, loading]);

  function openDeltaReplyCountSub(newIds: string[]) {
    if (newIds.length === 0) return;
    const sub = pool.subscribeMany(relays, [{ kinds: [1], "#e": newIds }], {
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
    replySubsRef.current.push(sub);
  }

  function loadBatch(until?: number) {
    const filter: Record<string, unknown> = { kinds: [1], "#t": [tag.toLowerCase()], limit: BATCH };
    if (until) filter.until = until;

    let total = 0;
    const newIdsThisBatch: string[] = [];

    const sub = pool.subscribeMany(relays, [filter as Parameters<typeof pool.subscribeMany>[1][0]], {
      onevent(event: Event) {
        // Skip replies
        if (event.tags.some((t) => t[0] === "e")) return;
        total++;
        if (seenIds.current.has(event.id)) return;
        seenIds.current.add(event.id);
        newIdsThisBatch.push(event.id);
        setPosts((prev) => {
          if (prev.find((e) => e.id === event.id)) return prev;
          return [...prev, event].sort((a, b) => b.created_at - a.created_at);
        });
      },
      oneose() {
        if (total === 0) setHasMore(false);
        sub.close();
        openDeltaReplyCountSub(newIdsThisBatch);
        if (until) setLoadingMore(false);
        else setLoading(false);
      },
    });
  }

  async function handleFollow(pubkey: string) {
    setPending(pubkey);
    try { await follow(pool, pubkey); }
    catch (e) { console.error("[HashtagFeed] follow failed:", e); }
    finally { setPending(null); }
  }

  // Reset and load on tag change
  useEffect(() => {
    if (!tag) return;
    setPosts([]);
    setReplyCounts(new Map());
    setLoading(true);
    setHasMore(true);
    seenIds.current = new Set();
    seenReplies.current = new Set();
    replySubsRef.current.forEach((s) => s.close());
    replySubsRef.current = [];
    liveSubRef.current?.close();
    loadBatch();

    const since = Math.floor(Date.now() / 1000);
    liveSubRef.current = pool.subscribeMany(relays, [{ kinds: [1], "#t": [tag.toLowerCase()], since }], {
      onevent(event: Event) {
        if (event.tags.some((t) => t[0] === "e")) return;
        if (seenIds.current.has(event.id)) return;
        seenIds.current.add(event.id);
        setPosts((prev) => {
          if (prev.find((e) => e.id === event.id)) return prev;
          return [event, ...prev].sort((a, b) => b.created_at - a.created_at);
        });
      },
    });

    return () => {
      liveSubRef.current?.close();
      replySubsRef.current.forEach((s) => s.close());
      replySubsRef.current = [];
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tag, pool, relays.join(",")]);

  const loadMore = useCallback(() => {
    const oldest = postsRef.current.at(-1);
    if (!oldest) return;
    setLoadingMore(true);
    loadBatch(oldest.created_at - 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tag, pool, relays.join(",")]);

  useEffect(() => { loadMoreRef.current = loadMore; }, [loadMore]);

  // Stable observer
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && canLoadRef.current) loadMoreRef.current();
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-fill when list doesn't fill container
  useEffect(() => {
    if (loading || loadingMore || !hasMore) return;
    const ul = feedRef.current;
    if (!ul || ul.scrollHeight > ul.clientHeight) return;
    loadMore();
  }, [loading, loadingMore, hasMore, loadMore]);

  return (
    <div className={scrollable ? "relative h-full" : "relative"}>
      {loading && (
        <div className={scrollable ? "absolute inset-0 flex items-start justify-center pt-8 pointer-events-none z-0" : "flex justify-center pt-8"}>
          <div className="w-6 h-6 rounded-full border-2 border-line-strong border-t-ink animate-spin" />
        </div>
      )}
      {!loading && posts.length === 0 && (
        <p className="text-ink-faint font-[family-name:var(--font-inter)] text-sm pt-8">
          No posts found for #{tag}.
        </p>
      )}
      <ul ref={feedRef} className={scrollable ? "overflow-y-auto h-full pr-2" : "pr-2"}>
        {posts.map((event) => (
          <li key={event.id} className="group/post relative z-10 leading-relaxed pt-6 pb-6 first:pt-0 border-b-[0.5px] border-line last:border-b-0">
            <div className="flex items-center justify-between gap-4 mb-2">
              <UserMeta pubkey={event.pubkey} />
              {event.pubkey !== myPubkey && !follows.includes(event.pubkey) && (
                <button
                  onClick={() => handleFollow(event.pubkey)}
                  disabled={pending === event.pubkey}
                  className="shrink-0 text-xs text-ink-faint hover:text-ink-soft font-[family-name:var(--font-inter)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {pending === event.pubkey ? "Following…" : "Follow"}
                </button>
              )}
            </div>
            <PostBody
              content={event.content}
              timestamp={timeAgo(event.created_at)}
              action={<ReplyButton eventId={event.id} eventPubkey={event.pubkey} />}
            />
            <PostReplies eventId={event.id} count={replyCounts.get(event.id) ?? 0} replyCounts={replyCounts} />
          </li>
        ))}
        <li><div ref={sentinelRef} className="h-4" /></li>
      </ul>
    </div>
  );
}
