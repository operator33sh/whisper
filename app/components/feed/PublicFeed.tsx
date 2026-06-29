"use client";

import { useNostrFeed } from "@/app/hooks/useNostr";
import { useFollows } from "@/app/hooks/useFollows";
import type { Event } from "nostr-tools";



export default function PublicFeed() {
  const events = useNostrFeed({ kinds: [1], limit: 50 });
  const follows = useFollows((s) => s.follows);
  const setFollows = useFollows((s) => s.setFollows);

  function follow(pubkey: string) {
    if (!follows.includes(pubkey)) setFollows([...follows, pubkey]);
  }

  const filtered = events.filter(
    (e: Event) =>
      !follows.includes(e.pubkey) &&
      e.tags.some((t) => t[0] === "e")
  );

  return (
    <section>
      <h2 className="text-2xl font-semibold mb-6">Feed</h2>
      <ul className="space-y-8">
        {filtered.map((event: Event) => (
          <li key={event.id} className="leading-relaxed">
            <div className="flex items-start justify-between gap-4">
              <p className="break-words min-w-0">{event.content}</p>
              <button
                onClick={() => follow(event.pubkey)}
                className="shrink-0 bg-black text-white text-xs px-3 py-1 rounded font-[family-name:var(--font-inter)] hover:bg-[#2d2d2d] transition-colors"
              >
                Follow
              </button>
            </div>
            <span className="text-sm text-[#2d2d2d]/50 mt-2 block font-[family-name:var(--font-inter)]">
              {new Date(event.created_at * 1000).toLocaleDateString("en-GB")}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
