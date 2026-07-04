"use client";

import { useEffect, useState } from "react";
import { useNostrContext } from "@/app/components/NostrProvider";
import { useRelays } from "@/app/hooks/useRelays";
import type { Event } from "nostr-tools";

export function useReplyCounts(eventIds: string[]): Map<string, number> {
  const { pool } = useNostrContext();
  const relays = useRelays((s) => s.relays);
  const [counts, setCounts] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    if (eventIds.length === 0) return;

    const sub = pool.subscribeMany(relays, [{ kinds: [1], "#e": eventIds }], {
      onevent(event: Event) {
        const eTags = event.tags.filter((t) => t[0] === "e");
        if (eTags.length === 0) return;

        const targetId = eTags.at(-1)![1];

        setCounts((prev) => {
          const next = new Map(prev);
          next.set(targetId, (next.get(targetId) ?? 0) + 1);
          return next;
        });
      },
    });

    return () => sub.close();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, relays.join(","), eventIds.join(",")]);

  return counts;
}
