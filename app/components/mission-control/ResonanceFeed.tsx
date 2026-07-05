"use client";

import { useEffect, useRef } from "react";
import { useNostrFeed } from "@/app/hooks/useNostr";
import { useMissionControl } from "@/app/hooks/useMissionControl";
import ResonanceItem from "./ResonanceItem";
import type { Filter } from "nostr-tools";

interface Props {
  pubkey: string;
}

export default function ResonanceFeed({ pubkey }: Props) {
  const filter: Filter = { kinds: [1], "#p": [pubkey], limit: 50 };
  const { events, loading } = useNostrFeed(filter);
  const activeView = useMissionControl((s) => s.activeView);
  const setHasPendingMentions = useMissionControl((s) => s.setHasPendingMentions);

  // Baseline: count at the moment initial load completes
  const baselineRef = useRef<number | null>(null);

  useEffect(() => {
    if (!loading && baselineRef.current === null) {
      baselineRef.current = events.length;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // Detect new arrivals after baseline
  useEffect(() => {
    if (baselineRef.current === null) return;
    if (events.length > baselineRef.current && activeView === "feed") {
      setHasPendingMentions(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events.length]);

  // Reset signal when user opens Mission Control
  useEffect(() => {
    if (activeView === "mission-control") {
      setHasPendingMentions(false);
      baselineRef.current = events.length;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView]);

  if (loading && events.length === 0) {
    return (
      <div className="flex justify-center pt-8">
        <div className="w-5 h-5 rounded-full border-2 border-[#2d2d2d]/20 border-t-[#2d2d2d] animate-spin" />
      </div>
    );
  }

  if (!events.length) {
    return (
      <p className="text-[#2d2d2d]/40 font-[family-name:var(--font-inter)] text-sm">
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
