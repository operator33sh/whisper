"use client";

import { useEffect, useRef, useState } from "react";
import PostContent from "@/app/components/ui/PostContent";

export default function PostBody({ content }: { content: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [truncated, setTruncated] = useState(false);
  const [expanded, setExpanded] = useState(false);

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
        className={!expanded ? "max-h-48 overflow-hidden" : undefined}
      >
        <PostContent content={content} />
      </div>
      {truncated && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-sm text-[#2d2d2d]/50 hover:text-[#2d2d2d] transition-colors mt-1 font-[family-name:var(--font-inter)]"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
}
