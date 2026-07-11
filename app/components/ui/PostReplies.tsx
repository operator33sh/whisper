"use client";

import { useEffect, useRef, useState } from "react";
import { useNostrContext } from "@/app/components/NostrProvider";
import { useFollows } from "@/app/hooks/useFollows";
import { useRelays } from "@/app/hooks/useRelays";
import { useOptimisticReplyCounts } from "@/app/hooks/useOptimisticReplyCounts";
import { useAccurateReplyCounts, requestAccurateReplyCount } from "@/app/hooks/useAccurateReplyCounts";
import { timeAgo } from "@/app/lib/timeAgo";
import { getReplyTarget } from "@/app/lib/replyTarget";
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
      className="shrink-0 text-xs text-ink-faint hover:text-ink-soft font-[family-name:var(--font-inter)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? "…" : isFollowing ? "Unfollow" : "Follow"}
    </button>
  );
}


export default function PostReplies({ eventId, count, replyCounts, rootEventId }: Props) {
  const root = rootEventId ?? eventId;
  const { pool } = useNostrContext();
  const relays = useRelays((s) => s.relays);
  const optimistic = useOptimisticReplyCounts((s) => s.increments.get(eventId) ?? 0);
  const accurate = useAccurateReplyCounts((s) => s.counts.get(eventId));
  // max: COUNT corrigeert te lage sub-tellingen; optimistic +1 wint als COUNT
  // vóór de eigen reply liep (COUNT ná publish telt de eigen reply al mee)
  const displayCount = Math.max(count + optimistic, accurate ?? 0);
  const [expanded, setExpanded] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  // Viewport-triggered NIP-45 COUNT for an accurate count
  useEffect(() => {
    const el = anchorRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) requestAccurateReplyCount(pool, relays, eventId);
    });
    observer.observe(el);
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, pool, relays.join(",")]);
  const [fetchKey, setFetchKey] = useState(0);
  const [replies, setReplies] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!expanded) return;

    setReplies([]);
    setLoading(true);
    const filter: Filter = { kinds: [1], "#e": [eventId], limit: 50 };
    const sub = pool.subscribeMany(relays, [filter], {
      onevent(event: Event) {
        if (getReplyTarget(event) !== eventId) return;
        setReplies((prev) => {
          if (prev.find((e) => e.id === event.id)) return prev;
          return [event, ...prev].sort((a, b) => b.created_at - a.created_at);
        });
      },
      oneose() {
        setLoading(false);
        sub.close();
      },
    });

    return () => sub.close();
  }, [expanded, fetchKey, eventId, pool]);

  // nul is stilte: geen "0 replies"-regel — maar de anchor blijft gemount
  // zodat de viewport-COUNT een te lage telling alsnog kan corrigeren
  if (displayCount === 0 && !expanded) return <div ref={anchorRef} />;

  return (
    <div ref={anchorRef} className="mt-2">
      <button
        onClick={() => {
          if (expanded) {
            setExpanded(false);
          } else {
            setFetchKey((k) => k + 1);
            setExpanded(true);
          }
        }}
        className="flex items-center gap-1 text-sm text-ink-soft font-[family-name:var(--font-inter)] hover:text-ink transition-colors"
      >
        <span>{expanded ? "−" : "+"}</span>
        <span>{displayCount} {displayCount === 1 ? "reply" : "replies"}</span>
      </button>

      {expanded && (
        <ul className="mt-4 space-y-4 pl-4 border-l border-line-strong">
          {replies.length === 0 ? (
            <li className="text-sm text-ink-faint font-[family-name:var(--font-inter)]">
              {loading ? "Loading…" : "No replies found"}
            </li>
          ) : (
            replies.map((reply) => {
              const replyCount = replyCounts?.get(reply.id) ?? 0;
              return (
                <li key={reply.id} className="group/post leading-relaxed">
                  <div className="flex items-center justify-between gap-4 mb-1">
                    <UserMeta pubkey={reply.pubkey} size={24} />
                    <FollowToggle pubkey={reply.pubkey} />
                  </div>
                  <PostBody
                    content={reply.content}
                    timestamp={timeAgo(reply.created_at)}
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
