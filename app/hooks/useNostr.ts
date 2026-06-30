"use client";

import { useCallback, useEffect, useState } from "react";
import { useNostrContext } from "@/app/components/NostrProvider";
import { RELAYS } from "@/app/lib/nostr";
import type { Event, Filter } from "nostr-tools";

export function useNostrFeed(filter: Filter) {
  const { pool } = useNostrContext();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const filterKey = JSON.stringify(filter);

  useEffect(() => {
    const parsed: Filter = JSON.parse(filterKey);

    if (parsed.authors !== undefined && parsed.authors.length === 0) {
      setEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    console.log("[useNostrFeed] subscribing with filter", parsed);

    const sub = pool.subscribeMany(RELAYS, [parsed], {
      onevent(event: Event) {
        setEvents((prev) => {
          if (prev.find((e) => e.id === event.id)) return prev;
          return [event, ...prev].sort((a, b) => b.created_at - a.created_at);
        });
      },
      oneose() {
        setLoading(false);
      },
    });

    return () => sub.close();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, filterKey]);

  const loadMore = useCallback(async () => {
    setEvents((current) => {
      const oldest = current.at(-1);
      if (!oldest) return current;

      setLoadingMore(true);
      const parsed: Filter = JSON.parse(filterKey);

      const sub = pool.subscribeMany(RELAYS, [{ ...parsed, until: oldest.created_at - 1 }], {
        onevent(event: Event) {
          setEvents((prev) => {
            if (prev.find((e) => e.id === event.id)) return prev;
            return [...prev, event].sort((a, b) => b.created_at - a.created_at);
          });
        },
        oneose() {
          setLoadingMore(false);
          sub.close();
        },
      });

      return current;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, filterKey]);

  return { events, loading, loadMore, loadingMore };
}
