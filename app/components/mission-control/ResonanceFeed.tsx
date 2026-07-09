"use client";

import { useEffect, useRef } from "react";
import { useNostrFeed } from "@/app/hooks/useNostr";
import { useNostrContext } from "@/app/components/NostrProvider";
import { useRelays } from "@/app/hooks/useRelays";
import { useMissionControl } from "@/app/hooks/useMissionControl";
import ResonanceItem from "./ResonanceItem";
import type { Filter } from "nostr-tools";

const LAST_CHECKED_KEY = "whisper:lastCheckedMentions";

interface Props {
  pubkey: string;
}

export default function ResonanceFeed({ pubkey }: Props) {
  const filter: Filter = { kinds: [1], "#p": [pubkey], limit: 50 };
  const { events, loading } = useNostrFeed(filter);
  const { pool } = useNostrContext();
  const relays = useRelays((s) => s.relays);
  const activeView = useMissionControl((s) => s.activeView);
  const setHasPendingMentions = useMissionControl((s) => s.setHasPendingMentions);
  const activeViewRef = useRef(activeView);
  useEffect(() => { activeViewRef.current = activeView; });

  // Startup: check for missed mentions since last visit
  useEffect(() => {
    if (!relays.length) return;
    const lastChecked = parseInt(localStorage.getItem(LAST_CHECKED_KEY) || "0", 10);
    if (!lastChecked) return; // first run, no baseline yet
    const sub = pool.subscribeMany(
      relays,
      [{ kinds: [1], "#p": [pubkey], since: lastChecked, limit: 1 }],
      {
        onevent() {
          setHasPendingMentions(true);
          sub.close();
        },
        oneose() {
          sub.close();
        },
      }
    );
    return () => sub.close();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, pubkey, relays.join(",")]);

  // Reset signal + save timestamp when user opens Mission Control
  useEffect(() => {
    if (activeView === "mission-control") {
      setHasPendingMentions(false);
      localStorage.setItem(LAST_CHECKED_KEY, Math.floor(Date.now() / 1000).toString());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView]);

  // Dedicated live subscription for new mention detection (since: now, no limit)
  useEffect(() => {
    const since = Math.floor(Date.now() / 1000);
    const sub = pool.subscribeMany(
      relays,
      [{ kinds: [1], "#p": [pubkey], since }],
      {
        onevent() {
          if (activeViewRef.current === "feed") {
            setHasPendingMentions(true);
          }
        },
      }
    );
    return () => sub.close();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, pubkey, relays.join(",")]);

  if (loading && events.length === 0) {
    return (
      <div className="flex justify-center pt-8">
        <div className="w-5 h-5 rounded-full border-2 border-line-strong border-t-ink animate-spin" />
      </div>
    );
  }

  if (!events.length) {
    return (
      <p className="text-ink-faint font-[family-name:var(--font-inter)] text-sm">
        No messages.
      </p>
    );
  }

  return (
    <ul className="flex flex-col">
      {events.map((event) => (
        <ResonanceItem key={event.id} event={event} />
      ))}
    </ul>
  );
}
