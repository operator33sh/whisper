"use client";

import { useEffect, useState } from "react";
import { useNostrContext } from "@/app/components/NostrProvider";
import { useFollows } from "@/app/hooks/useFollows";
import { useRelays } from "@/app/hooks/useRelays";
import { useOptimisticReplyCounts } from "@/app/hooks/useOptimisticReplyCounts";
import { timeAgo } from "@/app/lib/timeAgo";
import PostBody from "@/app/components/ui/PostBody";
import UserMeta from "@/app/components/ui/UserMeta";
import ReplyButton from "@/app/components/ui/ReplyButton";
import type { Event, Filter } from "nostr-tools";

interface Props {
  eventId: string;
  count: number;
  replyCounts?: Map<string, number>;
  rootEventId?: string;
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

function isDirectReply(event: Event, parentId: string): boolean {
  const eTags = event.tags.filter(t => t[0] === "e");
  const replyTag = eTags.find(t => t[3] === "reply");
  if (replyTag) return replyTag[1] === parentId;
  const rootTag = eTags.find(t => t[3] === "root");
  if (rootTag) return rootTag[1] === parentId;
  // legacy: last e tag is the direct parent
  return eTags.at(-1)?.[1] === parentId;
}

export default function PostReplies({ eventId, count, replyCounts, rootEventId }: Props) {
  const root = rootEventId ?? eventId;
  const { pool } = useNostrContext();
  const relays = useRelays((s) => s.relays);
  const optimistic = useOptimisticReplyCounts((s) => s.increments.get(eventId) ?? 0);
  const displayCount = count + optimistic;
  const [expanded, setExpanded] = useState(false);
  const [fetchKey, setFetchKey] = useState(0);
  const [replies, setReplies] = useState<Event[]>([]);

  useEffect(() => {
    if (!expanded) return;

    setReplies([]);
    const filter: Filter = { kinds: [1], "#e": [eventId], limit: 50 };
    const sub = pool.subscribeMany(relays, [filter], {
      onevent(event: Event) {
        if (!isDirectReply(event, eventId)) return;
        setReplies((prev) => {
          if (prev.find((e) => e.id === event.id)) return prev;
          return [event, ...prev].sort((a, b) => b.created_at - a.created_at);
        });
      },
      oneose() {
        sub.close();
      },
    });

    return () => sub.close();
  }, [expanded, fetchKey, eventId, pool]);

  return (
    <div className="mt-2">
      <button
        onClick={() => {
          if (displayCount === 0) return;
          if (expanded) {
            setExpanded(false);
          } else {
            setFetchKey((k) => k + 1);
            setExpanded(true);
          }
        }}
        disabled={displayCount === 0}
        className="flex items-center gap-1 text-sm text-[#2d2d2d]/50 font-[family-name:var(--font-inter)] disabled:cursor-default enabled:hover:text-[#2d2d2d] enabled:transition-colors"
      >
        <span>{expanded ? "−" : "+"}</span>
        <span>{displayCount} {displayCount === 1 ? "reply" : "replies"}</span>
      </button>

      {expanded && (
        <ul className="mt-4 space-y-4 pl-4 border-l border-[#2d2d2d]/20">
          {replies.length === 0 ? (
            <li className="text-sm text-[#2d2d2d]/40 font-[family-name:var(--font-inter)]">Loading…</li>
          ) : (
            replies.map((reply) => {
              const replyCount = replyCounts?.get(reply.id) ?? 0;
              return (
                <li key={reply.id} className="leading-relaxed">
                  <div className="flex items-center justify-between gap-4 mb-1">
                    <UserMeta pubkey={reply.pubkey} size={24} />
                    <FollowToggle pubkey={reply.pubkey} />
                  </div>
                  <PostBody
                    content={reply.content}
                    timestamp={`${new Date(reply.created_at * 1000).toLocaleDateString("en-GB")} · ${timeAgo(reply.created_at)}`}
                    action={<ReplyButton eventId={reply.id} eventPubkey={reply.pubkey} rootEventId={root} />}
                  />
                  <PostReplies
                    eventId={reply.id}
                    count={replyCount}
                    replyCounts={replyCounts}
                    rootEventId={root}
                  />
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
