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
        className="inline-flex items-center text-[#2d2d2d]/40 hover:text-[#2d2d2d]/60 transition-colors align-middle"
        aria-label="View profile"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
        </svg>
      </button>
      {open && <ProfileModal pubkey={pk} onClose={() => setOpen(false)} />}
    </>
  );
}
