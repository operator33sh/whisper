"use client";

import { useEffect, useState } from "react";
import { useNostrContext } from "@/app/components/NostrProvider";
import { useProfiles } from "@/app/hooks/useProfiles";
import { useFollows } from "@/app/hooks/useFollows";
import { useRelays } from "@/app/hooks/useRelays";
import HashtagFeed from "@/app/components/feed/HashtagFeed";
import ProfileFeed from "@/app/components/ui/ProfileFeed";
import Avatar from "@/app/components/ui/Avatar";
import { ProfileContext } from "@/app/context/ProfileContext";
import { npubEncode } from "nostr-tools/nip19";

interface Props {
  tag: string;
  onClose: () => void;
}

function ProfilePanel({ pubkey, onBack, onClose }: { pubkey: string; onBack: () => void; onClose: () => void }) {
  const { pool } = useNostrContext();
  const relays = useRelays((s) => s.relays);
  const profiles = useProfiles((s) => s.profiles);
  const fetchProfiles = useProfiles((s) => s.fetchProfiles);
  const follows = useFollows((s) => s.follows);
  const follow = useFollows((s) => s.follow);
  const unfollow = useFollows((s) => s.unfollow);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    fetchProfiles(pool, [pubkey]);
  }, [pool, pubkey, fetchProfiles]);

  const profile = profiles.get(pubkey);
  const name = profile?.display_name || profile?.name || npubEncode(pubkey).slice(0, 16) + "…";
  const isFollowing = follows.includes(pubkey);

  async function toggleFollow() {
    setPending(true);
    try {
      if (isFollowing) await unfollow(pool, pubkey);
      else await follow(pool, pubkey);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {profile?.banner ? (
        <div className="h-28 bg-[#e8e8e5] rounded-t-lg overflow-hidden shrink-0">
          <img src={profile.banner} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="h-28 bg-[#e8e8e5] rounded-t-lg shrink-0" />
      )}

      <div className="p-8 flex flex-col gap-4 flex-1 overflow-hidden">
        <div className="flex items-center gap-4">
          <Avatar pubkey={pubkey} picture={profile?.picture} size={48} />
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-lg leading-tight truncate">{name}</span>
            <span className="text-xs text-[#2d2d2d]/40 font-[family-name:var(--font-inter)] truncate">
              {npubEncode(pubkey).slice(0, 24)}…
            </span>
          </div>
        </div>

        {profile?.about && (
          <p className="text-sm text-[#2d2d2d]/70 leading-relaxed max-h-24 overflow-y-auto pr-1 whitespace-pre-wrap">
            {profile.about}
          </p>
        )}

        {profile?.website && (
          <a
            href={profile.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#2d2d2d]/50 hover:text-[#2d2d2d] transition-colors font-[family-name:var(--font-inter)] truncate"
          >
            {profile.website}
          </a>
        )}

        <div className="h-px bg-gradient-to-r from-transparent via-[#2d2d2d]/20 to-transparent shrink-0" />
        <div className="flex-1 overflow-hidden">
          <ProfileFeed pubkey={pubkey} />
        </div>

        <div className="flex justify-between gap-3 pt-2 shrink-0">
          <button
            onClick={onBack}
            className="text-sm px-4 py-2 font-[family-name:var(--font-inter)] text-[#2d2d2d]/60 hover:text-[#2d2d2d] transition-colors"
          >
            ← Back
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="text-sm px-4 py-2 font-[family-name:var(--font-inter)] text-[#2d2d2d]/60 hover:text-[#2d2d2d] transition-colors"
            >
              Close
            </button>
            <button
              onClick={toggleFollow}
              disabled={pending}
              className={`text-sm px-4 py-2 rounded font-[family-name:var(--font-inter)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isFollowing
                  ? "bg-white text-[#2d2d2d] border border-[#2d2d2d] hover:bg-[#f0f0ee]"
                  : "bg-black text-white hover:bg-[#2d2d2d]"
              }`}
            >
              {pending ? "…" : isFollowing ? "Unfollow" : "Follow"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HashtagModal({ tag, onClose }: Props) {
  const [profilePubkey, setProfilePubkey] = useState<string | null>(null);

  return (
    <ProfileContext.Provider value={{ openProfile: setProfilePubkey }}>
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <div
          className="bg-[#f9f9f7] rounded-lg w-full max-w-lg overflow-hidden flex flex-col"
          style={{ height: "836px", maxHeight: "90vh" }}
          onClick={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
        >
          {/* 2-panel slider */}
          <div
            className="flex h-full transition-transform duration-300 ease-in-out"
            style={{
              width: "200%",
              transform: profilePubkey ? "translateX(-50%)" : "translateX(0)",
            }}
          >
            {/* Panel 1: Hashtag feed */}
            <div className="w-1/2 flex flex-col h-full">
              <div className="flex items-center justify-between px-8 pt-6 pb-4 shrink-0 border-b border-[#2d2d2d]/10">
                <div>
                  <h2 className="text-xs uppercase tracking-widest text-[#2d2d2d]/40 font-[family-name:var(--font-inter)]">Hashtag</h2>
                  <p className="mt-0.5 text-sm text-[#2d2d2d]/70 font-[family-name:var(--font-inter)]">#{tag}</p>
                </div>
                <button
                  onClick={onClose}
                  className="text-sm px-4 py-2 font-[family-name:var(--font-inter)] text-[#2d2d2d]/60 hover:text-[#2d2d2d] transition-colors"
                >
                  Close
                </button>
              </div>
              <div className="flex-1 overflow-hidden px-8 py-4">
                <HashtagFeed tag={tag} />
              </div>
            </div>

            {/* Panel 2: Profile */}
            <div className="w-1/2 h-full overflow-hidden">
              {profilePubkey && (
                <ProfilePanel
                  pubkey={profilePubkey}
                  onBack={() => setProfilePubkey(null)}
                  onClose={onClose}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </ProfileContext.Provider>
  );
}
