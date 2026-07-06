"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useNostrContext } from "@/app/components/NostrProvider";
import { useRelays } from "@/app/hooks/useRelays";
import PostBody from "@/app/components/ui/PostBody";
import UserMeta from "@/app/components/ui/UserMeta";
import { timeAgo } from "@/app/lib/timeAgo";
import ReplyButton from "@/app/components/ui/ReplyButton";
import type { Event } from "nostr-tools";

const BATCH = 50;

export default function HashtagFeed({ tag }: { tag: string }) {
  const { pool } = useNostrContext();
  const relays = useRelays((s) => s.relays);

  const [posts, setPosts] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const feedRef = useRef<HTMLUListElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const postsRef = useRef<Event[]>([]);
  const canLoadRef = useRef(false);
  const loadMoreRef = useRef<() => void>(() => {});
  const seenIds = useRef<Set<string>>(new Set());

  useEffect(() => { postsRef.current = posts; }, [posts]);
  useEffect(() => {
    canLoadRef.current = !loadingMore && hasMore && !loading;
  }, [loadingMore, hasMore, loading]);

  function loadBatch(until?: number) {
    const filter: Record<string, unknown> = { kinds: [1], "#t": [tag.toLowerCase()], limit: BATCH };
    if (until) filter.until = until;

    let total = 0;

    const sub = pool.subscribeMany(relays, [filter as Parameters<typeof pool.subscribeMany>[1][0]], {
      onevent(event: Event) {
        // Skip replies
        if (event.tags.some((t) => t[0] === "e")) return;
        total++;
        if (seenIds.current.has(event.id)) return;
        seenIds.current.add(event.id);
        setPosts((prev) => {
          if (prev.find((e) => e.id === event.id)) return prev;
          return [...prev, event].sort((a, b) => b.created_at - a.created_at);
        });
      },
      oneose() {
        if (total === 0) setHasMore(false);
        sub.close();
        if (until) setLoadingMore(false);
        else setLoading(false);
      },
    });
  }

  // Reset and load on tag change
  useEffect(() => {
    if (!tag) return;
    setPosts([]);
    setLoading(true);
    setHasMore(true);
    seenIds.current = new Set();
    loadBatch();
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
    <div className="relative flex-1 overflow-hidden h-full">
      {(loading || posts.length === 0) && (
        <div className="absolute inset-0 flex items-start justify-center pt-8 pointer-events-none">
          <div className="w-6 h-6 rounded-full border-2 border-[#2d2d2d]/20 border-t-[#2d2d2d] animate-spin" />
        </div>
      )}
      <ul ref={feedRef} className="overflow-y-auto h-full pr-2">
        {posts.map((event) => (
          <li key={event.id} className="leading-relaxed bg-[#f9f9f7] pt-6 first:pt-0">
            <div className="flex items-center gap-4 mb-2">
              <UserMeta pubkey={event.pubkey} />
            </div>
            <PostBody
              content={event.content}
              timestamp={`${new Date(event.created_at * 1000).toLocaleDateString("en-GB")} · ${timeAgo(event.created_at)}`}
              action={<ReplyButton eventId={event.id} eventPubkey={event.pubkey} />}
            />
            <div className="mt-6 h-px bg-gradient-to-r from-transparent via-[#2d2d2d]/20 to-transparent" />
          </li>
        ))}
        <li><div ref={sentinelRef} className="h-4" /></li>
      </ul>
    </div>
  );
}
