"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNostrContext } from "@/app/components/NostrProvider";
import { useProfiles } from "@/app/hooks/useProfiles";
import { useProfileContext } from "@/app/context/ProfileContext";
import Avatar from "@/app/components/ui/Avatar";
import ProfileModal from "@/app/components/ui/ProfileModal";
import { npubEncode } from "nostr-tools/nip19";

interface Props {
  pubkey: string;
  size?: number;
}

export default function UserMeta({ pubkey, size = 32 }: Props) {
  const { pool } = useNostrContext();
  const profiles = useProfiles((s) => s.profiles);
  const fetchProfiles = useProfiles((s) => s.fetchProfiles);
  const profileContext = useProfileContext();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchProfiles(pool, [pubkey]);
  }, [pool, pubkey, fetchProfiles]);

  const profile = profiles.get(pubkey);
  const name = profile?.display_name || profile?.name || npubEncode(pubkey).slice(0, 16) + "…";

  function handleClick() {
    if (profileContext) {
      profileContext.openProfile(pubkey);
    } else {
      setOpen(true);
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        className="flex items-center gap-2 min-w-0 hover:opacity-70 transition-opacity"
      >
        <Avatar pubkey={pubkey} picture={profile?.picture} size={size} />
        <span className="text-sm text-ink-soft truncate font-[family-name:var(--font-inter)]">
          {name}
        </span>
      </button>
      {open && createPortal(<ProfileModal pubkey={pubkey} onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}
