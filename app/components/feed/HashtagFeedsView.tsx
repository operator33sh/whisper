"use client";

import { useEffect, useRef, useState } from "react";
import { useFollowedHashtags } from "@/app/hooks/useFollowedHashtags";
import HashtagFeed from "@/app/components/feed/HashtagFeed";
import { useMissionControl } from "@/app/hooks/useMissionControl";

export default function HashtagFeedsView() {
  const followedHashtags = useFollowedHashtags((s) => s.followedHashtags);
  const [slotA, setSlotA] = useState<string | null>(() => {
    try { return localStorage.getItem("whisper:hashtag-feed-slot-a") ?? null; } catch { return null; }
  });
  const [slotB, setSlotB] = useState<string | null>(() => {
    try { return localStorage.getItem("whisper:hashtag-feed-slot-b") ?? null; } catch { return null; }
  });
  const leftRef = useRef<HTMLElement>(null);
  const rightRef = useRef<HTMLElement>(null);
  const activeView = useMissionControl((s) => s.activeView);
  const activeViewRef = useRef(activeView);
  activeViewRef.current = activeView;

  useEffect(() => {
    function handleWheel(e: WheelEvent) {
      if (activeViewRef.current !== "hashtag-feeds") return;
      const isLeft = e.clientX < window.innerWidth / 2;
      const target = isLeft ? leftRef.current : rightRef.current;
      if (!target) return;
      target.scrollBy({ top: e.deltaY });
      e.preventDefault();
    }
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, []);

  const availableForA = followedHashtags.filter((t) => t !== slotB);
  const availableForB = followedHashtags.filter((t) => t !== slotA);

  if (followedHashtags.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-ink-faint font-[family-name:var(--font-inter)] text-center max-w-xs">
          No followed feeds yet. Click a hashtag in any post and press &ldquo;Follow Feed&rdquo;.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-12 h-full">
      <section ref={leftRef} className="flex flex-col overflow-y-auto pr-2">
        <header className="shrink-0 mb-4">
          <h2 className="text-xs uppercase tracking-widest text-ink-faint font-[family-name:var(--font-inter)]">Hashtag Feed</h2>
          <p className="mt-1 text-sm text-ink-soft font-[family-name:var(--font-inter)]">
            {slotA ? `#${slotA}` : "No feed selected"}
          </p>
          <div className="mt-3">
            <select
              value={slotA ?? ""}
              onChange={(e) => {
                const v = e.target.value || null;
                setSlotA(v);
                try { v ? localStorage.setItem("whisper:hashtag-feed-slot-a", v) : localStorage.removeItem("whisper:hashtag-feed-slot-a"); } catch {}
              }}
              className="border border-line-strong rounded px-3 py-1.5 text-sm font-[family-name:var(--font-inter)] bg-surface text-ink focus:outline-none focus:border-ink w-full appearance-none cursor-pointer"
            >
              <option value="">— Select a feed —</option>
              {availableForA.map((tag) => (
                <option key={tag} value={tag}>#{tag}</option>
              ))}
            </select>
          </div>
        </header>
        <div className="h-px bg-line shrink-0 mb-4" />
        {slotA ? (
          <HashtagFeed key={slotA} tag={slotA} scrollable={false} />
        ) : (
          <p className="text-sm text-ink-faint font-[family-name:var(--font-inter)] pt-4">
            Select a hashtag above to load the feed.
          </p>
        )}
      </section>

      <section ref={rightRef} className="flex flex-col overflow-y-auto pr-2">
        <header className="shrink-0 mb-4">
          <h2 className="text-xs uppercase tracking-widest text-ink-faint font-[family-name:var(--font-inter)]">Hashtag Feed</h2>
          <p className="mt-1 text-sm text-ink-soft font-[family-name:var(--font-inter)]">
            {slotB ? `#${slotB}` : "No feed selected"}
          </p>
          <div className="mt-3">
            <select
              value={slotB ?? ""}
              onChange={(e) => {
                const v = e.target.value || null;
                setSlotB(v);
                try { v ? localStorage.setItem("whisper:hashtag-feed-slot-b", v) : localStorage.removeItem("whisper:hashtag-feed-slot-b"); } catch {}
              }}
              className="border border-line-strong rounded px-3 py-1.5 text-sm font-[family-name:var(--font-inter)] bg-surface text-ink focus:outline-none focus:border-ink w-full appearance-none cursor-pointer"
            >
              <option value="">— Select a feed —</option>
              {availableForB.map((tag) => (
                <option key={tag} value={tag}>#{tag}</option>
              ))}
            </select>
          </div>
        </header>
        <div className="h-px bg-line shrink-0 mb-4" />
        {slotB ? (
          <HashtagFeed key={slotB} tag={slotB} scrollable={false} />
        ) : (
          <p className="text-sm text-ink-faint font-[family-name:var(--font-inter)] pt-4">
            Select a hashtag above to load the feed.
          </p>
        )}
      </section>
    </div>
  );
}
