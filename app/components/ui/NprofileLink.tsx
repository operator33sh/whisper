"use client";

import { useEffect, useState } from "react";
import { decode, npubEncode } from "nostr-tools/nip19";
import ProfileModal from "@/app/components/ui/ProfileModal";
import { useProfiles } from "@/app/hooks/useProfiles";
import { useNostrContext } from "@/app/components/NostrProvider";

function resolvePubkey(raw: string): string | null {
  try {
    const encoded = raw.replace("nostr:", "");
    const { type, data } = decode(encoded);
    if (type === "nprofile") return (data as { pubkey: string }).pubkey;
    if (type === "npub") return data as string;
  } catch {}
  return null;
}

export default function NprofileLink({ raw }: { raw: string }) {
  const [open, setOpen] = useState(false);
  const { pool } = useNostrContext();
  const profiles = useProfiles((s) => s.profiles);
  const fetchProfiles = useProfiles((s) => s.fetchProfiles);
  const pk = resolvePubkey(raw);

  useEffect(() => {
    if (pk) fetchProfiles(pool, [pk]);
  }, [pool, pk, fetchProfiles]);

  if (!pk) return <span>{raw}</span>;

  const profile = profiles.get(pk);
  const name = profile?.display_name || profile?.name || npubEncode(pk).slice(0, 12) + "…";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-[#2d2d2d]/40 hover:text-[#2d2d2d]/60 transition-colors align-middle"
        aria-label="View profile"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 shrink-0">
          <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
        </svg>
        <span className="text-sm font-[family-name:var(--font-inter)]">{name}</span>
      </button>
      {open && <ProfileModal pubkey={pk} onClose={() => setOpen(false)} />}
    </>
  );
}
