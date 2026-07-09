"use client";

import { useEffect } from "react";
import type { Event } from "nostr-tools";
import { useNostrFeed } from "@/app/hooks/useNostr";
import { useNostrContext } from "@/app/components/NostrProvider";
import { useEvents } from "@/app/hooks/useEvents";
import PostBody from "@/app/components/ui/PostBody";
import PostContent from "@/app/components/ui/PostContent";
import UserMeta from "@/app/components/ui/UserMeta";
import { timeAgo } from "@/app/lib/timeAgo";

interface Props {
  pubkey: string;
}

// Returns the full root e-tag so the relay hint (tag[2]) is available for the fetch
function getRootTag(event: Event): string[] | null {
  const eTags = event.tags.filter((t) => t[0] === "e");
  if (eTags.length === 0) return null;
  return eTags.find((t) => t[3] === "root") ?? eTags[0];
}

function RootPreview({ rootId, relayHint }: { rootId: string; relayHint?: string }) {
  const { pool } = useNostrContext();
  const fetchEvents = useEvents((s) => s.fetchEvents);
  const storedEvents = useEvents((s) => s.events);

  const root = storedEvents.get(rootId) ?? null;

  useEffect(() => {
    if (root) return;
    // Retry a few times while the root is missing (see ResonanceItem);
    // the store's `fetching` set dedupes in-flight requests
    const hints = relayHint ? [relayHint] : undefined;
    fetchEvents(pool, [rootId], hints);
    let attempts = 0;
    const timer = setInterval(() => {
      if (++attempts > 3) {
        clearInterval(timer);
        return;
      }
      fetchEvents(pool, [rootId], hints);
    }, 5000);
    return () => clearInterval(timer);
  }, [rootId, relayHint, root, pool, fetchEvents]);

  if (!root) {
    // Placeholder keeps the thread structure visible while the root is
    // loading or when it isn't available on any reachable relay
    return (
      <p className="mb-1 text-sm italic text-ink-faint font-[family-name:var(--font-inter)]">
        Original post not available
      </p>
    );
  }

  return (
    <div className="mb-1">
      <UserMeta pubkey={root.pubkey} size={20} />
      <div className="mt-1 text-sm line-clamp-3">
        <PostContent content={root.content} />
      </div>
    </div>
  );
}

export default function ReflectionLog({ pubkey }: Props) {
  const { events, loading } = useNostrFeed({ kinds: [1], authors: [pubkey], limit: 50 });

  if (loading && events.length === 0) {
    return (
      <div className="flex justify-center pt-8">
        <div className="w-5 h-5 rounded-full border-2 border-line-strong border-t-ink animate-spin" />
      </div>
    );
  }

  if (!events.length && !loading) {
    return (
      <p className="text-ink-faint font-[family-name:var(--font-inter)] text-sm">
        No posts yet.
      </p>
    );
  }

  const replies = events.filter((e) => e.tags.some((t) => t[0] === "e"));

  return (
    <ul className="flex flex-col">
      {replies.map((event) => {
        const rootTag = getRootTag(event);
        const rootId = rootTag?.[1];
        return (
          <li key={event.id} className="leading-relaxed pt-8 first:pt-0">
            {rootId ? (
              <>
                <RootPreview rootId={rootId} relayHint={rootTag?.[2] || undefined} />
                <div className="border-l-2 border-dashed border-line-strong h-3" />
                <div className="pl-4 border-l-2 border-line-strong">
                  <PostBody
                    content={event.content}
                    timestamp={timeAgo(event.created_at)}
                  />
                </div>
              </>
            ) : (
              <PostBody
                content={event.content}
                timestamp={timeAgo(event.created_at)}
              />
            )}
            <div className="mt-8 h-px bg-line" />
          </li>
        );
      })}
    </ul>
  );
}
