"use client";

import { useEffect, useRef, useState } from "react";
import PostContent from "@/app/components/ui/PostContent";

const IMAGE_REGEX = /https?:\/\/\S+\.(?:jpg|jpeg|png|gif|webp|avif)(?:\?\S*)?/i;
const VIDEO_REGEX = /https?:\/\/\S+\.(?:mp4|webm|mov|ogg)(?:\?\S*)?/i;
const EMBED_REGEX = /nostr:(?:nevent|note)1[a-z0-9]+/;

interface Props {
  content: string;
  timestamp: string;
  action?: React.ReactNode;
}

export default function PostBody({ content, timestamp, action }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [truncated, setTruncated] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const hasImage = IMAGE_REGEX.test(content);
  const hasVideo = VIDEO_REGEX.test(content);
  const hasEmbed = EMBED_REGEX.test(content);

  useEffect(() => {
    const el = ref.current;
    if (el && el.scrollHeight > el.clientHeight) {
      setTruncated(true);
    }
  }, [content]);

  return (
    <div>
      <div
        ref={ref}
        className={!hasImage && !hasVideo && !hasEmbed && !expanded ? "line-clamp-8" : undefined}
      >
        <PostContent content={content} />
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-sm text-[#2d2d2d]/50 font-[family-name:var(--font-inter)]">
          {timestamp}
        </span>
        <div className="flex items-center gap-3">
          {action}
          {truncated && !hasImage && !hasVideo && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-sm text-[#2d2d2d]/50 hover:text-[#2d2d2d] transition-colors font-[family-name:var(--font-inter)]"
            >
              {expanded ? "Show less" : "Read more"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
