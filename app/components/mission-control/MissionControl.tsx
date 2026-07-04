"use client";

import ResonanceFeed from "./ResonanceFeed";
import ReflectionLog from "./ReflectionLog";

interface Props {
  pubkey: string;
}

export default function MissionControl({ pubkey }: Props) {
  return (
    <div className="grid grid-cols-2 gap-12 h-full">
      <section className="flex flex-col gap-8 overflow-y-auto pr-4">
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

      <section className="flex flex-col gap-8 overflow-y-auto pr-4">
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
