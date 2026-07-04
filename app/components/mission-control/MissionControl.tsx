"use client";

import { useEffect, useRef } from "react";
import ResonanceFeed from "./ResonanceFeed";
import ReflectionLog from "./ReflectionLog";

interface Props {
  pubkey: string;
}

export default function MissionControl({ pubkey }: Props) {
  const leftRef = useRef<HTMLElement>(null);
  const rightRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function handleWheel(e: WheelEvent) {
      const isLeft = e.clientX < window.innerWidth / 2;
      const target = isLeft ? leftRef.current : rightRef.current;
      if (!target) return;
      target.scrollBy({ top: e.deltaY });
      e.preventDefault();
    }
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, []);

  return (
    <div className="grid grid-cols-2 gap-12 h-full">
      <section ref={leftRef} className="flex flex-col gap-8 overflow-y-auto pr-4">
        <header className="shrink-0">
          <h2 className="text-xs uppercase tracking-widest text-[#2d2d2d]/40 font-[family-name:var(--font-inter)]">
            Resonance
          </h2>
          <p className="mt-1 text-sm text-[#2d2d2d]/50 font-[family-name:var(--font-inter)]">
            Messages directed at you
          </p>
        </header>
        <ResonanceFeed pubkey={pubkey} />
      </section>

      <section ref={rightRef} className="flex flex-col gap-8 overflow-y-auto pr-4">
        <header className="shrink-0">
          <h2 className="text-xs uppercase tracking-widest text-[#2d2d2d]/40 font-[family-name:var(--font-inter)]">
            Reflection
          </h2>
          <p className="mt-1 text-sm text-[#2d2d2d]/50 font-[family-name:var(--font-inter)]">
            Your own voice
          </p>
        </header>
        <ReflectionLog pubkey={pubkey} />
      </section>
    </div>
  );
}
