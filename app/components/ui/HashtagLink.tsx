"use client";

import { useState } from "react";
import { useHashtagContext } from "@/app/context/HashtagContext";
import HashtagModal from "@/app/components/ui/HashtagModal";

export default function HashtagLink({ tag }: { tag: string }) {
  const ctx = useHashtagContext();
  const [open, setOpen] = useState(false);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (ctx) {
      ctx.openHashtag(tag);
    } else {
      setOpen(true);
    }
  }

  return (
    <>
      <span
        role="link"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => e.key === "Enter" && handleClick(e as unknown as React.MouseEvent)}
        className="underline text-[#2d2d2d]/70 hover:text-[#2d2d2d] transition-colors cursor-pointer"
      >
        #{tag}
      </span>
      {open && <HashtagModal tag={tag} onClose={() => setOpen(false)} />}
    </>
  );
}
