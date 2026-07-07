"use client";

import Shell from "@/app/components/layout/Shell";
import PublicFeed from "@/app/components/feed/PublicFeed";
import PrivateFeed from "@/app/components/feed/PrivateFeed";
import MissionControl from "@/app/components/mission-control/MissionControl";
import HashtagFeedsView from "@/app/components/feed/HashtagFeedsView";
import { useMissionControl } from "@/app/hooks/useMissionControl";
import { useNsec } from "@/app/components/NsecGate";

export default function Home() {
  const activeView = useMissionControl((s) => s.activeView);
  const { unlocked } = useNsec();

  return (
    <Shell>
      {/* Feeds: always mounted so subscriptions stay alive */}
      <div className={`grid grid-cols-2 gap-12 h-full ${activeView !== "feed" ? "hidden" : ""}`}>
        <PrivateFeed />
        <PublicFeed />
      </div>

      {/* Mission Control: mounts once unlocked, stays alive after */}
      {unlocked && (
        <div className={`h-full ${activeView !== "mission-control" ? "hidden" : ""}`}>
          <MissionControl />
        </div>
      )}

      {/* Hashtag Feeds: mounts once unlocked, stays alive after */}
      {unlocked && (
        <div className={`h-full ${activeView !== "hashtag-feeds" ? "hidden" : ""}`}>
          <HashtagFeedsView />
        </div>
      )}
    </Shell>
  );
}
