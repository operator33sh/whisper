"use client";

import { useEffect, useState } from "react";
import { useNostrContext } from "@/app/components/NostrProvider";
import { RELAYS } from "@/app/lib/nostr";
import { timeAgo } from "@/app/lib/timeAgo";
import UserMeta from "@/app/components/ui/UserMeta";
import PostBody from "@/app/components/ui/PostBody";
import ReplyButton from "@/app/components/ui/ReplyButton";
import type { Event } from "nostr-tools";

interface Props {
  event: Event; // the reply/mention directed at the user
}

function getRootEventId(event: Event): string | null {
  const eTags = event.tags.filter((t) => t[0] === "e");
  const rootTag = eTags.find((t) => t[3] === "root");
  if (rootTag) return rootTag[1];
  // legacy: first e-tag is root
  return eTags[0]?.[1] ?? null;
}

function timestamp(event: Event): string {
  return `${new Date(event.created_at * 1000).toLocaleDateString("en-GB")} · ${timeAgo(event.created_at)}`;
}

export default function ResonanceItem({ event }: Props) {
  const { pool } = useNostrContext();
  const [rootEvent, setRootEvent] = useState<Event | null>(null);

  const rootId = getRootEventId(event);

  useEffect(() => {
    if (!rootId || rootId === event.id) return;

    const sub = pool.subscribeMany(RELAYS, [{ ids: [rootId], kinds: [1] }], {
      onevent(e: Event) {
        setRootEvent(e);
        sub.close();
      },
      oneose() {
        sub.close();
      },
    });

    return () => sub.close();
  }, [rootId, event.id, pool]);

  return (
    <li className="flex flex-col gap-3 leading-relaxed">
      {/* Root event: the user's original post */}
      {rootEvent && rootEvent.id !== event.id && (
        <div>
          <div className="mb-2">
            <UserMeta pubkey={rootEvent.pubkey} />
          </div>
          <PostBody
            content={rootEvent.content}
            timestamp={timestamp(rootEvent)}
          />
        </div>
      )}

      {/* Reply: indented below */}
      <div className={rootEvent && rootEvent.id !== event.id ? "pl-5 border-l border-[#2d2d2d]/15" : ""}>
        <div className="mb-2">
          <UserMeta pubkey={event.pubkey} />
        </div>
        <PostBody
          content={event.content}
          timestamp={timestamp(event)}
          action={<ReplyButton eventId={event.id} eventPubkey={event.pubkey} rootEventId={rootId ?? undefined} />}
        />
      </div>
    </li>
  );
}
