"use client";

import { useNostrFeed } from "@/app/hooks/useNostr";
import { useFollows } from "@/app/hooks/useFollows";
import type { Event } from "nostr-tools";

export default function PrivateFeed() {
  const follows = useFollows((s) => s.follows);
  const setFollows = useFollows((s) => s.setFollows);
  const events = useNostrFeed({ kinds: [1], authors: follows, limit: 50 });

  function unfollow(pubkey: string) {
    setFollows(follows.filter((f) => f !== pubkey));
  }

  return (
    <section>
      <h2 className="text-2xl font-semibold mb-6">Following</h2>
      <ul className="space-y-4 mb-10">
        {follows.map((pubkey) => (
          <li key={pubkey} className="flex items-center justify-between font-[family-name:var(--font-inter)]">
            <span className="text-sm truncate max-w-xs">{pubkey}</span>
            <button
              onClick={() => unfollow(pubkey)}
              className="text-xs ml-4 px-3 py-1 border border-[#2d2d2d]/30 rounded hover:bg-[#2d2d2d] hover:text-[#f9f9f7] transition-colors"
            >
              Unfollow
            </button>
          </li>
        ))}
      </ul>
      <ul className="space-y-8">
        {events.map((event: Event) => (
          <li key={event.id} className="leading-relaxed">
            <p className="break-words">{event.content}</p>
            <span className="text-sm text-[#2d2d2d]/50 mt-2 block font-[family-name:var(--font-inter)]">
              {new Date(event.created_at * 1000).toLocaleDateString("en-GB")}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
