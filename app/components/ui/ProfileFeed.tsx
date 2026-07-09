"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useNostrContext } from "@/app/components/NostrProvider";
import { useRelays } from "@/app/hooks/useRelays";
import { useReplyCounts } from "@/app/hooks/useReplyCounts";
import { timeAgo } from "@/app/lib/timeAgo";
import PostBody from "@/app/components/ui/PostBody";
import ReplyButton from "@/app/components/ui/ReplyButton";
import PostReplies from "@/app/components/ui/PostReplies";
import type { Event } from "nostr-tools";

interface Props {
  pubkey: string;
}

export default function ProfileFeed({ pubkey }: Props) {
  const { pool } = useNostrContext();
  const relays = useRelays((s) => s.relays);
  const [events, setEvents] = useState<Event[]>([]);
  const { counts: replyCounts } = useReplyCounts(events.map((e) => e.id));
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEvents([]);
    setLoading(true);
    setHasMore(true);

    const sub = pool.subscribeMany(
      relays,
      [{ kinds: [1], authors: [pubkey], limit: 50 }],
      {
        onevent(event: Event) {
          if (event.tags.some((t) => t[0] === "e")) return;
          setEvents((prev) => {
            if (prev.find((e) => e.id === event.id)) return prev;
            return [...prev, event].sort((a, b) => b.created_at - a.created_at);
          });
        },
        oneose() {
          setLoading(false);
          sub.close();
        },
      }
    );

    return () => sub.close();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, pubkey, relays.join(",")]);

  const loadMore = useCallback(() => {
    setEvents((current) => {
      const oldest = current.at(-1);
      if (!oldest) return current;

      setLoadingMore(true);
      let batchCount = 0;

      const sub = pool.subscribeMany(
        relays,
        [{ kinds: [1], authors: [pubkey], until: oldest.created_at - 1, limit: 50 }],
        {
          onevent(event: Event) {
            if (event.tags.some((t) => t[0] === "e")) return;
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

      return current;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, pubkey, relays.join(",")]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loadingMore && hasMore && !loading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore, loadingMore, hasMore, loading]);

  return (
    <div className="relative h-[400px]">
      {loading && events.length === 0 && (
        <div className="absolute inset-0 flex items-start justify-center pt-8 pointer-events-none">
          <div className="w-5 h-5 rounded-full border-2 border-line-strong border-t-ink animate-spin" />
        </div>
      )}
      <ul className="overflow-y-auto h-full pr-2">
        {events.map((event) => (
          <li key={event.id} className="group/post leading-relaxed pt-6 first:pt-0">
            <PostBody
              content={event.content}
              timestamp={timeAgo(event.created_at)}
              action={<ReplyButton eventId={event.id} eventPubkey={event.pubkey} />}
            />
            <PostReplies eventId={event.id} count={replyCounts.get(event.id) ?? 0} replyCounts={replyCounts} />
            <div className="mt-6 h-px bg-line" />
          </li>
        ))}
        <li>
          <div ref={sentinelRef} className="h-4" />
        </li>
      </ul>
    </div>
  );
}
