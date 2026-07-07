"use client";

import { useEffect, useState } from "react";
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
        <h2 className="text-xs uppercase tracking-widest text-[#2d2d2d]/40 font-[family-name:var(--font-inter)]">Search results</h2>
        <p className="mt-1 text-sm text-[#2d2d2d]/50 font-[family-name:var(--font-inter)]">{query}</p>
      </header>
      <div className="relative flex-1 overflow-hidden">
        {loading && results.length === 0 && (
          <div className="absolute inset-0 flex items-start justify-center pt-8 pointer-events-none">
            <div className="w-6 h-6 rounded-full border-2 border-[#2d2d2d]/20 border-t-[#2d2d2d] animate-spin" />
          </div>
        )}
        {!loading && results.length === 0 && (
          <p className="text-[#2d2d2d]/40 font-[family-name:var(--font-inter)] text-sm">No results.</p>
        )}
        <ul className="overflow-y-auto h-full pr-2">
          {results.map((event) => {
            const isMinimized = event.tags.filter((t) => t[0] === "t").length > 8 && !expandedPosts.has(event.id);
            return (
              <li key={event.id} className="leading-relaxed bg-[#f9f9f7] pt-8 first:pt-0">
                <div className="flex items-center justify-between gap-4 mb-2">
                  <UserMeta pubkey={event.pubkey} />
                  {event.pubkey !== myPubkey && (
                    <button
                      onClick={() => handleFollowToggle(event.pubkey)}
                      disabled={pending === event.pubkey}
                      className={`shrink-0 text-xs px-3 py-1 rounded font-[family-name:var(--font-inter)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        follows.includes(event.pubkey)
                          ? "bg-white text-[#2d2d2d] border border-[#2d2d2d] hover:bg-[#f0f0ee]"
                          : "bg-black text-white hover:bg-[#2d2d2d]"
                      }`}
                    >
                      {pending === event.pubkey ? "…" : follows.includes(event.pubkey) ? "Unfollow" : "Follow"}
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
                    <PostReplies eventId={event.id} count={replyCounts.get(event.id) ?? 0} replyCounts={replyCounts} />
                  </>
                )}
                <div className="mt-8 h-px bg-gradient-to-r from-transparent via-[#2d2d2d]/20 to-transparent" />
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
