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

function getRootId(event: Event): string | null {
  const eTags = event.tags.filter((t) => t[0] === "e");
  if (eTags.length === 0) return null;
  return eTags.find((t) => t[3] === "root")?.[1] ?? eTags[0][1];
}

function RootPreview({ rootId }: { rootId: string }) {
  const { pool } = useNostrContext();
  const fetchEvents = useEvents((s) => s.fetchEvents);
  const storedEvents = useEvents((s) => s.events);

  useEffect(() => {
    fetchEvents(pool, [rootId]);
  }, [rootId, pool, fetchEvents]);

  const root = storedEvents.get(rootId) ?? null;
  if (!root) return null;

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
        const rootId = getRootId(event);
        return (
          <li key={event.id} className="leading-relaxed pt-8 first:pt-0">
            {rootId ? (
              <>
                <RootPreview rootId={rootId} />
                <div className="border-l-2 border-dashed border-line-strong h-3" />
                <div className="pl-4 border-l-2 border-line-strong">
                  <PostBody
                    content={event.content}
                    timestamp={`${new Date(event.created_at * 1000).toLocaleDateString("en-GB")} · ${timeAgo(event.created_at)}`}
                  />
                </div>
              </>
            ) : (
              <PostBody
                content={event.content}
                timestamp={`${new Date(event.created_at * 1000).toLocaleDateString("en-GB")} · ${timeAgo(event.created_at)}`}
              />
            )}
            <div className="mt-8 h-px bg-line" />
          </li>
        );
      })}
    </ul>
  );
}
