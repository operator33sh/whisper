"use client";

import { useEffect, useState } from "react";
import { useNostrContext } from "@/app/components/NostrProvider";
import { RELAYS } from "@/app/lib/nostr";
import type { Event } from "nostr-tools";

export function useReplyCounts(): Map<string, number> {
  const { pool } = useNostrContext();
  const [counts, setCounts] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    console.log("[useReplyCounts] subscribing to kind:1 replies");

    let received = 0;

    const sub = pool.subscribeMany(RELAYS, [{ kinds: [1], limit: 1000 }], {
      onevent(event: Event) {
        const eTags = event.tags.filter((t) => t[0] === "e");
        if (eTags.length === 0) return;

        const targetId = eTags.at(-1)![1];

        received++;
        if (received <= 3) {
          console.log("[useReplyCounts] sample reply", { id: event.id, eTags, targetId });
        }

        setCounts((prev) => {
          const next = new Map(prev);
          next.set(targetId, (next.get(targetId) ?? 0) + 1);
          return next;
        });
      },
    });

    return () => {
      console.log("[useReplyCounts] closing subscription");
      sub.close();
    };
  }, [pool]);

  return counts;
}
