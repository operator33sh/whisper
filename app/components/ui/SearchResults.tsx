"use client";

import { useEffect, useRef, useState } from "react";
import { useNostrContext } from "@/app/components/NostrProvider";
import { useRelays } from "@/app/hooks/useRelays";
import { useReplyCounts } from "@/app/hooks/useReplyCounts";
import { useFollows, getNsecPubkey } from "@/app/hooks/useFollows";
import { timeAgo } from "@/app/lib/timeAgo";
import UserMeta from "@/app/components/ui/UserMeta";
import PostBody from "@/app/components/ui/PostBody";
import PostReplies from "@/app/components/ui/PostReplies";
import ReplyButton from "@/app/components/ui/ReplyButton";
import type { Event } from "nostr-tools";

interface Props {
  query: string;
}

export default function SearchResults({ query }: Props) {
  const { pool } = useNostrContext();
  const relays = useRelays((s) => s.relays);
  const follows = useFollows((s) => s.follows);
  const follow = useFollows((s) => s.follow);
  const unfollow = useFollows((s) => s.unfollow);
  const myPubkey = getNsecPubkey();
  const [results, setResults] = useState<Event[]>([]);
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    function handleWheel(e: WheelEvent) {
      if (!listRef.current) return;
      listRef.current.scrollBy({ top: e.deltaY });
      e.preventDefault();
    }
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, []);
  const { counts: replyCounts } = useReplyCounts(results.map((e) => e.id));

  async function handleFollowToggle(pubkey: string) {
    setPending(pubkey);
    try {
      if (follows.includes(pubkey)) await unfollow(pool, pubkey);
      else await follow(pool, pubkey);
    } catch (e) {
      console.error("[SearchResults] follow failed:", e);
    } finally {
      setPending(null);
    }
  }

  useEffect(() => {
    if (!query || !relays.length) { setResults([]); return; }
    setResults([]);
    setLoading(true);
    const sub = pool.subscribeMany(
      relays,
      [{ kinds: [1], search: query, limit: 30 }],
      {
        onevent(event: Event) {
          setResults((prev) => {
            if (prev.some((e) => e.id === event.id)) return prev;
            return [...prev, event].sort((a, b) => b.created_at - a.created_at);
          });
        },
        oneose() { setLoading(false); sub.close(); },
      }
    );
    return () => sub.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, pool, relays.join(",")]);

  return (
    <section className="h-full flex flex-col overflow-hidden max-w-[416px]">
      <header className="shrink-0 mb-6">
        <h2 className="text-xs uppercase tracking-widest text-ink-faint font-[family-name:var(--font-inter)]">Search results</h2>
        <p className="mt-1 text-sm text-ink-soft font-[family-name:var(--font-inter)]">{query}</p>
      </header>
      <div className="relative flex-1 overflow-hidden">
        {loading && results.length === 0 && (
          <div className="absolute inset-0 flex items-start justify-center pt-8 pointer-events-none">
            <div className="w-6 h-6 rounded-full border-2 border-line-strong border-t-ink animate-spin" />
          </div>
        )}
        {!loading && results.length === 0 && (
          <p className="text-ink-faint font-[family-name:var(--font-inter)] text-sm">No results.</p>
        )}
        <ul ref={listRef} className="overflow-y-auto h-full pr-2">
          {results.map((event) => {
            const isMinimized = event.tags.filter((t) => t[0] === "t").length > 8 && !expandedPosts.has(event.id);
            return (
              <li key={event.id} className="group/post leading-relaxed bg-bg pt-8 pb-8 first:pt-0 border-b-[0.5px] border-line last:border-b-0">
                <div className="flex items-center justify-between gap-4 mb-2">
                  <UserMeta pubkey={event.pubkey} />
                  {event.pubkey !== myPubkey && (
                    <button
                      onClick={() => handleFollowToggle(event.pubkey)}
                      disabled={pending === event.pubkey}
                      className="shrink-0 text-xs text-ink-faint hover:text-ink-soft font-[family-name:var(--font-inter)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {pending === event.pubkey ? "…" : follows.includes(event.pubkey) ? "Unfollow" : "Follow"}
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
        </ul>
      </div>
    </section>
  );
}
