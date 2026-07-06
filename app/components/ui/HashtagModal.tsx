"use client";

import HashtagFeed from "@/app/components/feed/HashtagFeed";

interface Props {
  tag: string;
  onClose: () => void;
}

export default function HashtagModal({ tag, onClose }: Props) {
  return (
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
        {/* Header */}
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

        {/* Feed */}
        <div className="flex-1 overflow-hidden px-8 py-4">
          <HashtagFeed tag={tag} />
        </div>
      </div>
    </div>
  );
}
