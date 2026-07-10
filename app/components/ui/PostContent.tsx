"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import NprofileLink from "@/app/components/ui/NprofileLink";
import NeventEmbed from "@/app/components/ui/NeventEmbed";
import HashtagLink from "@/app/components/ui/HashtagLink";

function ImageModal({ src, onClose }: { src: string; onClose: () => void }) {
  return createPortal(
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70] p-4"
      onClick={onClose}
    >
      <img
        src={src}
        alt=""
        className="max-w-3xl max-h-[80vh] w-full rounded object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body
  );
}

const MEDIA_REGEX = /(https?:\/\/\S+\.(?:jpg|jpeg|png|gif|webp|avif|mp4|webm|mov|ogg)(?:\?\S*)?)/gi;
const VIDEO_REGEX = /\.(?:mp4|webm|mov|ogg)(?:\?|$)/i;
const URL_REGEX = /(https?:\/\/[^\s]+)/g;
const NPROFILE_REGEX = /(nostr:n(?:profile|pub)1[a-z0-9]+|npub1[a-z0-9]+)/g;
const NEVENT_REGEX = /(nostr:(?:nevent|note)1[a-z0-9]+)/g;
const YOUTUBE_REGEX = /(https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)[\w-]+(?:[?&][\w=&%-]*)?)/gi;
const HASHTAG_REGEX = /(#[a-zA-Z0-9_]+)/g;

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([\w-]+)/);
  return m ? m[1] : null;
}

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
            className="underline text-ink-soft hover:text-ink transition-colors break-all"
          >
            {upart}
          </a>
        );
      }
      // Hashtag splitting within non-URL text
      const hparts = upart.split(HASHTAG_REGEX);
      return hparts.map((hpart, hi) => {
        if (HASHTAG_REGEX.test(hpart)) {
          HASHTAG_REGEX.lastIndex = 0;
          return <HashtagLink key={`${keyPrefix}-n${ni}-u${ui}-h${hi}`} tag={hpart.slice(1)} />;
        }
        return hpart || null;
      });
    });
  });
}

export default function PostContent({ content }: { content: string }) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  // Collapse runs of blank lines into a single newline and trim edges
  const normalized = content.replace(/\n\s*\n+/g, "\n\n").trim();
  const neventChunks = normalized.split(NEVENT_REGEX);

  return (
    <div className="break-words min-w-0 space-y-2 whitespace-pre-wrap">
      {neventChunks.map((chunk, ci) => {
        if (NEVENT_REGEX.test(chunk)) {
          NEVENT_REGEX.lastIndex = 0;
          return <NeventEmbed key={ci} raw={chunk} />;
        }
        if (!chunk) return null;

        const ytChunks = chunk.split(YOUTUBE_REGEX);
        return ytChunks.map((ytChunk, yi) => {
          if (YOUTUBE_REGEX.test(ytChunk)) {
            YOUTUBE_REGEX.lastIndex = 0;
            const id = getYouTubeId(ytChunk);
            if (id) {
              return (
                <iframe
                  key={`${ci}-yt${yi}`}
                  src={`https://www.youtube-nocookie.com/embed/${id}`}
                  className="rounded w-full aspect-video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              );
            }
          }
          if (!ytChunk) return null;

          const parts = ytChunk.split(MEDIA_REGEX);
          return parts.map((part, i) => {
            if (MEDIA_REGEX.test(part)) {
              MEDIA_REGEX.lastIndex = 0;
              if (VIDEO_REGEX.test(part)) {
                return (
                  <video
                    key={`${ci}-${yi}-${i}`}
                    src={part}
                    controls
                    className="rounded-md max-w-full max-h-96"
                    preload="metadata"
                  />
                );
              }
              return (
                <img
                  key={`${ci}-${yi}-${i}`}
                  src={part}
                  alt=""
                  className="rounded-md max-w-full max-h-96 object-cover cursor-pointer"
                  loading="lazy"
                  onClick={() => setLightbox(part)}
                />
              );
            }
            return part ? <span key={`${ci}-${yi}-${i}`}>{renderTextWithLinks(part, `${ci}-${yi}-${i}`)}</span> : null;
          });
        });
      })}
      {lightbox && <ImageModal src={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}
