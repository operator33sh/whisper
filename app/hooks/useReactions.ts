"use client";

import { useEffect, useState } from "react";
import { useNostrContext } from "@/app/components/NostrProvider";
import { RELAY_URL } from "@/app/lib/nostr";
import type { Event } from "nostr-tools";

export function useReactions(): Map<string, number> {
  const { pool } = useNostrContext();
  const [counts, setCounts] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    console.log("[useReactions] subscribing to kind:7 events");

    const sub = pool.subscribeMany([RELAY_URL], [{ kinds: [7], limit: 1000 }], {
      onevent(event: Event) {
        const targetId = event.tags.findLast((t) => t[0] === "e")?.[1];
        if (!targetId) return;

        setCounts((prev) => {
          const next = new Map(prev);
          next.set(targetId, (next.get(targetId) ?? 0) + 1);
          return next;
        });
      },
    });

    return () => {
      console.log("[useReactions] closing subscription");
      sub.close();
    };
  }, [pool]);

  return counts;
}
