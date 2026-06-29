"use client";

import { useEffect, useState } from "react";
import { useNostrContext } from "@/app/components/NostrProvider";
import { RELAYS } from "@/app/lib/nostr";
import type { Event, Filter } from "nostr-tools";

export function useNostrFeed(filter: Filter) {
  const { pool } = useNostrContext();
  const [events, setEvents] = useState<Event[]>([]);
  const filterKey = JSON.stringify(filter);

  useEffect(() => {
    const parsed: Filter = JSON.parse(filterKey);

    if (parsed.authors !== undefined && parsed.authors.length === 0) {
      setEvents([]);
      return;
    }

    console.log("[useNostrFeed] subscribing with filter", parsed);

    const sub = pool.subscribeMany(RELAYS, [parsed], {
      onevent(event: Event) {
        setEvents((prev) => {
          if (prev.find((e) => e.id === event.id)) return prev;
          return [event, ...prev].sort((a, b) => b.created_at - a.created_at);
        });
      },
    });

    return () => sub.close();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, filterKey]);

  return events;
}
