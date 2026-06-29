"use client";

import { useEffect, useState } from "react";
import { decode } from "nostr-tools/nip19";
import { useNostrContext } from "@/app/components/NostrProvider";
import { useProfiles } from "@/app/hooks/useProfiles";
import { useFollows } from "@/app/hooks/useFollows";
import Avatar from "@/app/components/ui/Avatar";
import { npubEncode } from "nostr-tools/nip19";

interface Props {
  raw: string; // the full "nostr:nprofile1..." string
}

function ProfileModal({ pubkey, onClose }: { pubkey: string; onClose: () => void }) {
  const { pool } = useNostrContext();
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
  const name = profile?.display_name || profile?.name || npubEncode(pubkey).slice(0, 20) + "…";
  const npub = npubEncode(pubkey);
  const isFollowing = follows.includes(pubkey);

  async function toggleFollow() {
    setPending(true);
    try {
      if (isFollowing) {
        await unfollow(pool, pubkey);
      } else {
        await follow(pool, pubkey);
      }
    } catch (e) {
      console.error("[ProfileModal]", e);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-[#f9f9f7] rounded-lg p-8 w-full max-w-md flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-4">
          <Avatar pubkey={pubkey} picture={profile?.picture} size={48} />
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-lg leading-tight truncate">{name}</span>
            <span className="text-xs text-[#2d2d2d]/40 font-[family-name:var(--font-inter)] truncate">
              {npub.slice(0, 24)}…
            </span>
          </div>
        </div>

        {profile?.about && (
          <p className="text-sm text-[#2d2d2d]/70 leading-relaxed">{profile.about}</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
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
  );
}

export default function NprofileLink({ raw }: Props) {
  const [open, setOpen] = useState(false);

  let pubkey: string | null = null;
  try {
    const encoded = raw.replace("nostr:", "");
    const { type, data } = decode(encoded);
    if (type === "nprofile") pubkey = (data as { pubkey: string }).pubkey;
    else if (type === "npub") pubkey = data as string;
  } catch {
    return <span>{raw}</span>;
  }

  if (!pubkey) return <span>{raw}</span>;

  const pk = pubkey;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="underline text-[#2d2d2d]/40 hover:text-[#2d2d2d]/60 transition-colors"
      >
        profile
      </button>
      {open && <ProfileModal pubkey={pk} onClose={() => setOpen(false)} />}
    </>
  );
}
