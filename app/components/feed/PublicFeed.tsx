"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useFollows, getNsecPubkey } from "@/app/hooks/useFollows";
import { useNostrContext } from "@/app/components/NostrProvider";
import { useRelays } from "@/app/hooks/useRelays";
import PostBody from "@/app/components/ui/PostBody";
import UserMeta from "@/app/components/ui/UserMeta";
import { timeAgo } from "@/app/lib/timeAgo";
import { getReplyTarget } from "@/app/lib/replyTarget";
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
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const [replyCounts, setReplyCounts] = useState<Map<string, number>>(new Map());
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const feedRef = useRef<HTMLUListElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const postsRef = useRef<Event[]>([]);
  // One reply sub per batch — stays open to receive ongoing replies
  const replySubsRef = useRef<Array<{ close: () => void }>>([]);
  // Live sub for new posts + new replies published after initial load
  const liveSubRef = useRef<{ close: () => void } | null>(null);
  const seenReplies = useRef<Set<string>>(new Set());
  const allPostIds = useRef<Set<string>>(new Set());
  const canLoadRef = useRef(false);
  const loadMoreRef = useRef<() => void>(() => {});

  useEffect(() => { postsRef.current = posts; }, [posts]);
  useEffect(() => {
    canLoadRef.current = !loadingMore && hasMore && !loadingPosts;
  }, [loadingMore, hasMore, loadingPosts]);

  // Open a reply-count sub for only the new IDs from this batch (delta)
  function openDeltaReplyCountSub(newIds: string[]) {
    if (newIds.length === 0) return;
    console.log(`[PublicFeed] openDeltaReplyCountSub for ${newIds.length} new IDs`);

    const CHUNK = 200;
    for (let i = 0; i < newIds.length; i += CHUNK) {
      const chunk = newIds.slice(i, i + CHUNK);
      const sub = pool.subscribeMany(relays, [{ kinds: [1], "#e": chunk }], {
        onevent(event: Event) {
          if (seenReplies.current.has(event.id)) return;
          seenReplies.current.add(event.id);
          const eTag = getReplyTarget(event);
          if (!eTag) return;
          console.log(`[PublicFeed] reply counted for post ${eTag.slice(0, 8)}...`);
          setReplyCounts((prev) => {
            const next = new Map(prev);
            next.set(eTag, (next.get(eTag) ?? 0) + 1);
            return next;
          });
        },
      });
      replySubsRef.current.push(sub);
    }
  }

  // Load a batch of posts (oldest.created_at - 1 as until for pagination)
  function loadBatch(until?: number) {
    const filter: Record<string, unknown> = { kinds: [1], limit: BATCH };
    if (until) filter.until = until;

    console.log("[PublicFeed] loadBatch open", until ? `until=${until}` : "initial");

    let totalFromRelay = 0;
    let replies = 0;
    let postCount = 0;
    const newIdsThisBatch: string[] = [];

    const sub = pool.subscribeMany(relays, [filter as Parameters<typeof pool.subscribeMany>[1][0]], {
      onevent(event: Event) {
        totalFromRelay++;
        if (event.tags.some((t) => t[0] === "e")) {
          replies++;
          return; // skip replies
        }
        postCount++;
        console.log(`[PublicFeed] post received id=${event.id.slice(0, 8)} at=${event.created_at}`);
        if (!allPostIds.current.has(event.id)) {
          allPostIds.current.add(event.id);
          newIdsThisBatch.push(event.id);
        }
        setPosts((prev) => {
          if (prev.find((e) => e.id === event.id)) return prev;
          return [...prev, event].sort((a, b) => b.created_at - a.created_at);
        });
      },
      oneose() {
        console.log(`[PublicFeed] loadBatch EOSE — total=${totalFromRelay} posts=${postCount} replies=${replies} newIds=${newIdsThisBatch.length}`);
        if (totalFromRelay === 0) setHasMore(false);
        sub.close();
        openDeltaReplyCountSub(newIdsThisBatch);
        if (until) setLoadingMore(false);
        else setLoadingPosts(false);
      },
    });
  }

  // Initial load
  useEffect(() => {
    console.log("[PublicFeed] initial load");
    setLoadingPosts(true);
    setPosts([]);
    setReplyCounts(new Map());
    setHasMore(true);
    replySubsRef.current.forEach((s) => s.close());
    replySubsRef.current = [];
    liveSubRef.current?.close();
    seenReplies.current = new Set();
    allPostIds.current = new Set();
    loadBatch();

    // Live sub: picks up new posts and new replies published after this point
    const since = Math.floor(Date.now() / 1000);
    liveSubRef.current = pool.subscribeMany(relays, [{ kinds: [1], since }], {
      onevent(event: Event) {
        if (event.tags.some((t) => t[0] === "e")) {
          // It's a reply — update count for the parent post
          if (seenReplies.current.has(event.id)) return;
          seenReplies.current.add(event.id);
          const eTag = getReplyTarget(event);
          if (!eTag) return;
          console.log(`[PublicFeed] live reply for post ${eTag.slice(0, 8)}...`);
          setReplyCounts((prev) => {
            const next = new Map(prev);
            next.set(eTag, (next.get(eTag) ?? 0) + 1);
            return next;
          });
        } else {
          // It's a new top-level post — add to the feed
          if (allPostIds.current.has(event.id)) return;
          allPostIds.current.add(event.id);
          console.log(`[PublicFeed] live new post id=${event.id.slice(0, 8)}`);
          setPosts((prev) => {
            if (prev.find((e) => e.id === event.id)) return prev;
            return [event, ...prev].sort((a, b) => b.created_at - a.created_at);
          });
        }
      },
    });

    return () => {
      replySubsRef.current.forEach((s) => s.close());
      replySubsRef.current = [];
      liveSubRef.current?.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, relays.join(",")]);

  const loadMore = useCallback(() => {
    const oldest = postsRef.current.at(-1);
    if (!oldest) return;
    console.log(`[PublicFeed] loadMore triggered — oldest post at ${oldest.created_at}, total posts so far: ${postsRef.current.length}`);
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
      ([entry]) => {
        console.log(`[PublicFeed] sentinel intersecting=${entry.isIntersecting} canLoad=${canLoadRef.current}`);
        if (entry.isIntersecting && canLoadRef.current) loadMoreRef.current();
      },
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
        <p className="font-[family-name:var(--font-crimson)] italic text-sm text-ink-faint">Discover posts from the network</p>
      </header>
      <div className="relative flex-1 overflow-hidden">
        {(loadingPosts || filtered.length === 0) && (
          <div className="absolute inset-0 flex items-start justify-center pt-8 pointer-events-none">
            <div className="w-6 h-6 rounded-full border-2 border-line-strong border-t-ink animate-spin" />
          </div>
        )}
        <ul ref={feedRef} className="relative overflow-y-auto h-full pr-2">
          {filtered.map((event) => {
            const isMinimized = event.tags.filter((t) => t[0] === "t").length > 8 && !expandedPosts.has(event.id);
            return (
              <li key={event.id} className="group/post leading-relaxed pt-8 pb-8 first:pt-0 border-b-[0.5px] border-line last:border-b-0">
                <div className="flex items-center justify-between gap-4 mb-2">
                  <UserMeta pubkey={event.pubkey} />
                  {event.pubkey !== myPubkey && (
                    <button
                      onClick={() => handleFollow(event.pubkey)}
                      disabled={pending === event.pubkey}
                      className="shrink-0 text-xs text-ink-faint hover:text-ink-soft font-[family-name:var(--font-inter)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {pending === event.pubkey ? "Following…" : "Follow"}
                    </button>
                  )}
                </div>
                {isMinimized ? (
                  <button
                    onClick={() => setExpandedPosts((prev) => new Set([...prev, event.id]))}
                    className="text-xs text-ink-faint hover:text-ink transition-colors font-[family-name:var(--font-inter)] mt-1"
                  >
                    + Post minimalized
                  </button>
                ) : (
                  <>
                    <PostBody
                      content={event.content}
                      timestamp={timeAgo(event.created_at)}
                      action={<ReplyButton eventId={event.id} eventPubkey={event.pubkey} />}
                    />
                    <PostReplies eventId={event.id} count={replyCounts.get(event.id) ?? 0} replyCounts={replyCounts} />
                  </>
                )}
              </li>
            );
          })}
          <li><div ref={sentinelRef} className="h-4" /></li>
        </ul>
      </div>
    </section>
  );
}
