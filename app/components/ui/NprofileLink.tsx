"use client";

import { useState } from "react";
import { decode } from "nostr-tools/nip19";
import ProfileModal from "@/app/components/ui/ProfileModal";

export default function NprofileLink({ raw }: { raw: string }) {
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
        className="text-[#2d2d2d]/40 hover:text-[#2d2d2d]/60 transition-colors"
      >
        profile
      </button>
      {open && <ProfileModal pubkey={pk} onClose={() => setOpen(false)} />}
    </>
  );
}
