"use client";

import { useEffect, useState } from "react";
import { useNostrContext } from "@/app/components/NostrProvider";
import { useFollows } from "@/app/hooks/useFollows";
import { RELAYS } from "@/app/lib/nostr";
import { timeAgo } from "@/app/lib/timeAgo";
import PostBody from "@/app/components/ui/PostBody";
import UserMeta from "@/app/components/ui/UserMeta";
import type { Event, Filter } from "nostr-tools";

interface Props {
  eventId: string;
  count: number;
}

function FollowToggle({ pubkey }: { pubkey: string }) {
  const { pool } = useNostrContext();
  const follows = useFollows((s) => s.follows);
  const follow = useFollows((s) => s.follow);
  const unfollow = useFollows((s) => s.unfollow);
  const [pending, setPending] = useState(false);

  const isFollowing = follows.includes(pubkey);

  async function toggle() {
    setPending(true);
    try {
      if (isFollowing) {
        await unfollow(pool, pubkey);
      } else {
        await follow(pool, pubkey);
      }
    } catch (e) {
      console.error("[FollowToggle]", e);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={`shrink-0 text-xs px-2 py-0.5 rounded font-[family-name:var(--font-inter)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        isFollowing
          ? "bg-white text-[#2d2d2d] border border-[#2d2d2d] hover:bg-[#f0f0ee]"
          : "bg-black text-white hover:bg-[#2d2d2d]"
      }`}
    >
      {pending ? "…" : isFollowing ? "Unfollow" : "Follow"}
    </button>
  );
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
        onClick={() => count > 0 && setExpanded((v) => !v)}
        disabled={count === 0}
        className="flex items-center gap-1 text-sm text-[#2d2d2d]/50 font-[family-name:var(--font-inter)] disabled:cursor-default enabled:hover:text-[#2d2d2d] enabled:transition-colors"
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
                <div className="flex items-center justify-between gap-4 mb-1">
                  <UserMeta pubkey={reply.pubkey} size={24} />
                  <FollowToggle pubkey={reply.pubkey} />
                </div>
                <PostBody content={reply.content} />
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
