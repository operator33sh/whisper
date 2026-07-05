"use client";

import { useEffect, useRef, useState } from "react";
import { useNostrContext } from "@/app/components/NostrProvider";
import { useRelays } from "@/app/hooks/useRelays";
import type { Event } from "nostr-tools";

export function useReplyCounts(eventIds: string[]): { counts: Map<string, number>; loading: boolean } {
  const { pool } = useNostrContext();
  const relays = useRelays((s) => s.relays);
  const [counts, setCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [debouncedIds, setDebouncedIds] = useState<string[]>([]);
  const seenReplies = useRef<Set<string>>(new Set());

  // Debounce: wacht tot de lijst stabiliseert voor een nieuwe subscription
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedIds(eventIds), 500);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventIds.join(",")]);

  useEffect(() => {
    if (debouncedIds.length === 0) return;

    setLoading(true);

    const CHUNK = 50;
    const chunks: string[][] = [];
    for (let i = 0; i < debouncedIds.length; i += CHUNK) {
      chunks.push(debouncedIds.slice(i, i + CHUNK));
    }

    // Process chunks sequentially: one REQ open at a time
    let cancelled = false;
    let currentSub: { close: () => void } | null = null;
    let chunkIdx = 0;

    function fetchNext() {
      if (cancelled || chunkIdx >= chunks.length) {
        if (!cancelled) setLoading(false);
        return;
      }
      const chunk = chunks[chunkIdx++];
      currentSub = pool.subscribeMany(relays, [{ kinds: [1], "#e": chunk }], {
        onevent(event: Event) {
          if (cancelled) return;
          if (seenReplies.current.has(event.id)) return;
          seenReplies.current.add(event.id);
          const eTags = event.tags.filter((t) => t[0] === "e");
          if (eTags.length === 0) return;
          const targetId = eTags.at(-1)![1];
          setCounts((prev) => {
            const next = new Map(prev);
            next.set(targetId, (next.get(targetId) ?? 0) + 1);
            return next;
          });
        },
        oneose() {
          currentSub?.close();
          fetchNext();
        },
      });
    }

    fetchNext();

    return () => {
      cancelled = true;
      currentSub?.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, relays.join(","), debouncedIds.join(",")]);

  return { counts, loading };
}
