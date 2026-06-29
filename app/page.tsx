import Shell from "@/app/components/layout/Shell";
import PublicFeed from "@/app/components/feed/PublicFeed";
import PrivateFeed from "@/app/components/feed/PrivateFeed";

export default function Home() {
  return (
    <Shell>
      <div className="grid grid-cols-2 gap-12 h-full">
        <PublicFeed />
        <PrivateFeed />
      </div>
    </Shell>
  );
}
