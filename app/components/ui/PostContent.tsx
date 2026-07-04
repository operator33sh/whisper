"use client";

import { useState } from "react";
import NprofileLink from "@/app/components/ui/NprofileLink";
import NeventEmbed from "@/app/components/ui/NeventEmbed";

function ImageModal({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <img
        src={src}
        alt=""
        className="max-w-3xl max-h-[80vh] w-full rounded object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

const MEDIA_REGEX = /(https?:\/\/\S+\.(?:jpg|jpeg|png|gif|webp|avif|mp4|webm|mov|ogg)(?:\?\S*)?)/gi;
const VIDEO_REGEX = /\.(?:mp4|webm|mov|ogg)(?:\?|$)/i;
const URL_REGEX = /(https?:\/\/[^\s]+)/g;
const NPROFILE_REGEX = /(nostr:n(?:profile|pub)1[a-z0-9]+)/g;
const NEVENT_REGEX = /(nostr:(?:nevent|note)1[a-z0-9]+)/g;

function renderTextWithLinks(text: string, keyPrefix: string) {
  // Split on nprofile/npub references first, then URLs within remaining text
  const nparts = text.split(NPROFILE_REGEX);
  return nparts.map((npart, ni) => {
    if (NPROFILE_REGEX.test(npart)) {
      NPROFILE_REGEX.lastIndex = 0;
      return <NprofileLink key={`${keyPrefix}-n${ni}`} raw={npart} />;
    }

    // Regular URL splitting within non-nprofile text
    const uparts = npart.split(URL_REGEX);
    return uparts.map((upart, ui) => {
      if (URL_REGEX.test(upart)) {
        URL_REGEX.lastIndex = 0;
        return (
          <a
            key={`${keyPrefix}-n${ni}-u${ui}`}
            href={upart}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-[#2d2d2d]/70 hover:text-[#2d2d2d] transition-colors break-all"
          >
            {upart}
          </a>
        );
      }
      return upart || null;
    });
  });
}

export default function PostContent({ content }: { content: string }) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const neventChunks = content.split(NEVENT_REGEX);

  return (
    <div className="break-words min-w-0 space-y-2">
      {neventChunks.map((chunk, ci) => {
        if (NEVENT_REGEX.test(chunk)) {
          NEVENT_REGEX.lastIndex = 0;
          return <NeventEmbed key={ci} raw={chunk} />;
        }
        if (!chunk) return null;

        const parts = chunk.split(MEDIA_REGEX);
        return parts.map((part, i) => {
          if (MEDIA_REGEX.test(part)) {
            MEDIA_REGEX.lastIndex = 0;
            if (VIDEO_REGEX.test(part)) {
              return (
                <video
                  key={`${ci}-${i}`}
                  src={part}
                  controls
                  className="rounded max-w-full max-h-96"
                  preload="metadata"
                />
              );
            }
            return (
              <img
                key={`${ci}-${i}`}
                src={part}
                alt=""
                className="rounded max-w-full cursor-pointer"
                loading="lazy"
                onClick={() => setLightbox(part)}
              />
            );
          }
          return part ? <span key={`${ci}-${i}`}>{renderTextWithLinks(part, `${ci}-${i}`)}</span> : null;
        });
      })}
      {lightbox && <ImageModal src={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}
