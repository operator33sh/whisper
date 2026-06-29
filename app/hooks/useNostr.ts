"use client";

import { useEffect, useState } from "react";
import { pool, RELAY_URL } from "@/app/lib/nostr";
import type { Event, Filter } from "nostr-tools";

export function useNostrFeed(filter: Filter) {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    const sub = pool.subscribeMany([RELAY_URL], [filter], {
      onevent(event: Event) {
        setEvents((prev) => {
          if (prev.find((e) => e.id === event.id)) return prev;
          return [event, ...prev].sort((a, b) => b.created_at - a.created_at);
        });
      },
    });

    return () => sub.close();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return events;
}
