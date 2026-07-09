"use client";

import { useEffect } from "react";
import { useNostrContext } from "@/app/components/NostrProvider";
import { useEvents } from "@/app/hooks/useEvents";
import { timeAgo } from "@/app/lib/timeAgo";
import UserMeta from "@/app/components/ui/UserMeta";
import PostBody from "@/app/components/ui/PostBody";
import ReplyButton from "@/app/components/ui/ReplyButton";
import type { Event } from "nostr-tools";

interface Props {
  event: Event; // the reply/mention directed at the user
}

// The direct parent being replied to (NIP-10: "reply" marker, fallback to "root", legacy: last e-tag)
function getParentEventId(event: Event): string | null {
  const eTags = event.tags.filter((t) => t[0] === "e");
  const replyTag = eTags.find((t) => t[3] === "reply");
  if (replyTag) return replyTag[1];
  const rootTag = eTags.find((t) => t[3] === "root");
  if (rootTag) return rootTag[1];
  return eTags.at(-1)?.[1] ?? null;
}

// The thread root, for passing to ReplyButton so threading stays correct
function getRootEventId(event: Event): string | null {
  const eTags = event.tags.filter((t) => t[0] === "e");
  const rootTag = eTags.find((t) => t[3] === "root");
  if (rootTag) return rootTag[1];
  return eTags[0]?.[1] ?? null;
}

function timestamp(event: Event): string {
  return timeAgo(event.created_at);
}

export default function ResonanceItem({ event }: Props) {
  const { pool } = useNostrContext();
  const fetchEvents = useEvents((s) => s.fetchEvents);
  const storedEvents = useEvents((s) => s.events);

  const parentId = getParentEventId(event);
  const rootId = getRootEventId(event);

  const parentEvent = parentId && parentId !== event.id ? (storedEvents.get(parentId) ?? null) : null;

  useEffect(() => {
    if (!parentId || parentId === event.id || parentEvent) return;
    // Retry a few times while the parent is missing (failed fetches never
    // update the store, so deps alone would never re-trigger this effect);
    // the store's `fetching` set dedupes in-flight requests
    fetchEvents(pool, [parentId]);
    let attempts = 0;
    const timer = setInterval(() => {
      if (++attempts > 3) {
        clearInterval(timer);
        return;
      }
      fetchEvents(pool, [parentId]);
    }, 5000);
    return () => clearInterval(timer);
  }, [parentId, event.id, parentEvent, pool, fetchEvents]);

  const hasParent = parentEvent && parentEvent.id !== event.id;


  return (
    <li className="group/post flex flex-col gap-3 leading-relaxed pt-8 first:pt-0">
      {/* Parent: the message directly replied to */}
      {hasParent && (
        <div>
          <div className="mb-2">
            <UserMeta pubkey={parentEvent.pubkey} />
          </div>
          <PostBody
            content={parentEvent.content}
            timestamp={timestamp(parentEvent)}
          />
        </div>
      )}

      {/* The reply/mention: indented below parent */}
      <div className={hasParent ? "pl-5 border-l border-line-strong/15" : ""}>
        <div className="mb-2">
          <UserMeta pubkey={event.pubkey} />
        </div>
        <PostBody
          content={event.content}
          timestamp={timestamp(event)}
          action={<ReplyButton eventId={event.id} eventPubkey={event.pubkey} rootEventId={rootId ?? undefined} />}
        />
      </div>
      <div className="mt-6 h-px bg-line" />
    </li>
  );
}
