"use client";

import { useState, useEffect } from "react";
import { useNostrContext } from "@/app/components/NostrProvider";
import { useRelays } from "@/app/hooks/useRelays";
import { timeAgo } from "@/app/lib/timeAgo";
import UserMeta from "@/app/components/ui/UserMeta";
import PostBody from "@/app/components/ui/PostBody";
import type { Event } from "nostr-tools";

interface Props {
  query: string;
}

export default function SearchResults({ query }: Props) {
  const { pool } = useNostrContext();
  const relays = useRelays((s) => s.relays);
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [results, setResults] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!debouncedQuery || !relays.length) { setResults([]); return; }
    setResults([]);
    setLoading(true);
    const sub = pool.subscribeMany(
      relays,
      [{ kinds: [1], search: debouncedQuery, limit: 30 }],
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
  }, [debouncedQuery, pool, relays.join(",")]);

  return (
    <section className="h-full flex flex-col overflow-hidden">
      <header className="shrink-0 mb-6">
        <h2 className="text-xs uppercase tracking-widest text-[#2d2d2d]/40 font-[family-name:var(--font-inter)]">Search results</h2>
        <p className="mt-1 text-sm text-[#2d2d2d]/50 font-[family-name:var(--font-inter)]">{debouncedQuery}</p>
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
          {results.map((event) => (
            <li key={event.id} className="leading-relaxed bg-[#f9f9f7] pt-8 first:pt-0">
              <div className="mb-2">
                <UserMeta pubkey={event.pubkey} />
              </div>
              <PostBody
                content={event.content}
                timestamp={`${new Date(event.created_at * 1000).toLocaleDateString("en-GB")} · ${timeAgo(event.created_at)}`}
              />
              <div className="mt-8 h-px bg-gradient-to-r from-transparent via-[#2d2d2d]/20 to-transparent" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
