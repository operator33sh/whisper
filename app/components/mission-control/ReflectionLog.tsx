"use client";

import { useNostrFeed } from "@/app/hooks/useNostr";
import PostBody from "@/app/components/ui/PostBody";
import { timeAgo } from "@/app/lib/timeAgo";

interface Props {
  pubkey: string;
}

export default function ReflectionLog({ pubkey }: Props) {
  const { events, loading } = useNostrFeed({ kinds: [1], authors: [pubkey], limit: 50 });

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
        No posts yet.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-10">
      {events.map((event) => (
        <li key={event.id} className="leading-relaxed">
          <PostBody
            content={event.content}
            timestamp={`${new Date(event.created_at * 1000).toLocaleDateString("en-GB")} · ${timeAgo(event.created_at)}`}
          />
        </li>
      ))}
    </ul>
  );
}
