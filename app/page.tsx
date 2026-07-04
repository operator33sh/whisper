"use client";

import { useEffect, useState } from "react";
import Shell from "@/app/components/layout/Shell";
import PublicFeed from "@/app/components/feed/PublicFeed";
import PrivateFeed from "@/app/components/feed/PrivateFeed";
import MissionControl from "@/app/components/mission-control/MissionControl";
import { useMissionControl } from "@/app/hooks/useMissionControl";
import { getNsecPubkey } from "@/app/hooks/useFollows";

export default function Home() {
  const activeView = useMissionControl((s) => s.activeView);
  const [pubkey, setPubkey] = useState<string | null>(null);

  useEffect(() => {
    setPubkey(getNsecPubkey());
  }, []);

  return (
    <Shell>
      {/* Feeds: always mounted so subscriptions stay alive */}
      <div className={`grid grid-cols-2 gap-12 h-full ${activeView === "mission-control" ? "hidden" : ""}`}>
        <PublicFeed />
        <PrivateFeed />
      </div>

      {/* Mission Control: mounts on first visit, stays alive after */}
      {pubkey && (
        <div className={`h-full ${activeView === "feed" ? "hidden" : ""}`}>
          <MissionControl pubkey={pubkey} />
        </div>
      )}
    </Shell>
  );
}
