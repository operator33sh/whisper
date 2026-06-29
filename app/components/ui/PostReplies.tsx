"use client";

import { useEffect, useState } from "react";
import { useNostrContext } from "@/app/components/NostrProvider";
import { RELAYS } from "@/app/lib/nostr";
import { timeAgo } from "@/app/lib/timeAgo";
import Avatar from "@/app/components/ui/Avatar";
import PostContent from "@/app/components/ui/PostContent";
import { npubEncode } from "nostr-tools/nip19";
import type { Event, Filter } from "nostr-tools";

interface Props {
  eventId: string;
  count: number;
}

export default function PostReplies({ eventId, count }: Props) {
  const { pool } = useNostrContext();
  const [expanded, setExpanded] = useState(false);
  const [replies, setReplies] = useState<Event[]>([]);

  useEffect(() => {
    if (!expanded) return;

    const filter: Filter = { kinds: [1], "#e": [eventId], limit: 50 };
    const sub = pool.subscribeMany(RELAYS, [filter], {
      onevent(event: Event) {
        setReplies((prev) => {
          if (prev.find((e) => e.id === event.id)) return prev;
          return [event, ...prev].sort((a, b) => b.created_at - a.created_at);
        });
      },
    });

    return () => sub.close();
  }, [expanded, eventId, pool]);

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1 text-sm text-[#2d2d2d]/50 hover:text-[#2d2d2d] transition-colors font-[family-name:var(--font-inter)]"
      >
        <span>{expanded ? "−" : "+"}</span>
        <span>{count} {count === 1 ? "reply" : "replies"}</span>
      </button>

      {expanded && (
        <ul className="mt-4 space-y-4 pl-4 border-l border-[#2d2d2d]/20">
          {replies.length === 0 ? (
            <li className="text-sm text-[#2d2d2d]/40 font-[family-name:var(--font-inter)]">Loading…</li>
          ) : (
            replies.map((reply) => (
              <li key={reply.id} className="leading-relaxed">
                <div className="flex items-center gap-2 mb-1">
                  <Avatar pubkey={reply.pubkey} />
                  <span className="text-xs text-[#2d2d2d]/40 truncate font-[family-name:var(--font-inter)]">
                    {npubEncode(reply.pubkey)}
                  </span>
                </div>
                <PostContent content={reply.content} />
                <span className="text-xs text-[#2d2d2d]/40 mt-1 block font-[family-name:var(--font-inter)]">
                  {new Date(reply.created_at * 1000).toLocaleDateString("en-GB")} · {timeAgo(reply.created_at)}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
