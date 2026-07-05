"use client";

import { useEffect, useRef, useState } from "react";
import PostContent from "@/app/components/ui/PostContent";

const IMAGE_REGEX = /https?:\/\/\S+\.(?:jpg|jpeg|png|gif|webp|avif)(?:\?\S*)?/i;
const VIDEO_REGEX = /https?:\/\/\S+\.(?:mp4|webm|mov|ogg)(?:\?\S*)?/i;
const YOUTUBE_REGEX = /https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)[\w-]+/i;
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
  const hasYouTube = YOUTUBE_REGEX.test(content);
  const hasEmbed = EMBED_REGEX.test(content);

  useEffect(() => {
    const el = ref.current;
    if (el && el.scrollHeight > el.clientHeight) {
      setTruncated(true);
    }
  }, [content]);

  const canTruncate = !hasImage && !hasVideo && !hasYouTube && !hasEmbed;

  return (
    <div>
      <div
        ref={ref}
        className={canTruncate && !expanded ? "line-clamp-8" : undefined}
      >
        <PostContent content={content} />
      </div>
      {truncated && canTruncate && (
        <div className="flex justify-end">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-1 text-[#2d2d2d]/50 underline underline-offset-2 hover:text-[#2d2d2d] transition-colors font-[family-name:var(--font-inter)]"
          >
            {expanded ? "Show less" : "Read more"}
          </button>
        </div>
      )}
      <div className="flex items-center justify-between mt-2">
        <span className="text-sm text-[#2d2d2d]/50 font-[family-name:var(--font-inter)]">
          {timestamp}
        </span>
        <div className="flex items-center gap-3">
          {action}
        </div>
      </div>
    </div>
  );
}
