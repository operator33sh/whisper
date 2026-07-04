"use client";

import { useEffect, useRef, useState } from "react";
import ResonanceFeed from "./ResonanceFeed";
import ReflectionLog from "./ReflectionLog";
import { useMissionControl } from "@/app/hooks/useMissionControl";
import { getNsecPubkey } from "@/app/hooks/useFollows";
import { useNsec } from "@/app/components/NsecGate";

const Spinner = () => (
  <div className="flex justify-center pt-8">
    <div className="w-5 h-5 rounded-full border-2 border-[#2d2d2d]/20 border-t-[#2d2d2d] animate-spin" />
  </div>
);

export default function MissionControl() {
  const { unlocked } = useNsec();
  const [pubkey, setPubkey] = useState<string | null>(null);
  const leftRef = useRef<HTMLElement>(null);
  const rightRef = useRef<HTMLElement>(null);
  const activeView = useMissionControl((s) => s.activeView);
  const activeViewRef = useRef(activeView);
  activeViewRef.current = activeView;

  useEffect(() => {
    if (!unlocked) return;
    setPubkey(getNsecPubkey());
  }, [unlocked]);

  useEffect(() => {
    function handleWheel(e: WheelEvent) {
      if (activeViewRef.current !== "mission-control") return;
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
        {pubkey ? <ResonanceFeed pubkey={pubkey} /> : <Spinner />}
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
        {pubkey ? <ReflectionLog pubkey={pubkey} /> : <Spinner />}
      </section>
    </div>
  );
}
