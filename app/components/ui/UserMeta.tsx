"use client";

import { useEffect } from "react";
import { useNostrContext } from "@/app/components/NostrProvider";
import { useProfiles } from "@/app/hooks/useProfiles";
import Avatar from "@/app/components/ui/Avatar";
import { npubEncode } from "nostr-tools/nip19";

interface Props {
  pubkey: string;
  size?: number;
}

export default function UserMeta({ pubkey, size = 32 }: Props) {
  const { pool } = useNostrContext();
  const profiles = useProfiles((s) => s.profiles);
  const fetchProfiles = useProfiles((s) => s.fetchProfiles);

  useEffect(() => {
    fetchProfiles(pool, [pubkey]);
  }, [pool, pubkey, fetchProfiles]);

  const profile = profiles.get(pubkey);
  const name = profile?.display_name || profile?.name || npubEncode(pubkey).slice(0, 16) + "…";

  return (
    <div className="flex items-center gap-2 min-w-0">
      <Avatar pubkey={pubkey} picture={profile?.picture} size={size} />
      <span className="text-sm text-[#2d2d2d]/60 truncate font-[family-name:var(--font-inter)]">
        {name}
      </span>
    </div>
  );
}
