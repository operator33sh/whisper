const MEDIA_REGEX = /(https?:\/\/\S+\.(?:jpg|jpeg|png|gif|webp|avif|mp4|webm|mov|ogg)(?:\?\S*)?)/gi;
const VIDEO_REGEX = /\.(?:mp4|webm|mov|ogg)(?:\?|$)/i;
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

function renderTextWithLinks(text: string, keyPrefix: string) {
  const parts = text.split(URL_REGEX);
  return parts.map((part, i) => {
    if (URL_REGEX.test(part)) {
      URL_REGEX.lastIndex = 0;
      return (
        <a
          key={`${keyPrefix}-${i}`}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-[#2d2d2d]/70 hover:text-[#2d2d2d] transition-colors break-all"
        >
          {part}
        </a>
      );
    }
    return part || null;
  });
}

export default function PostContent({ content }: { content: string }) {
  const parts = content.split(MEDIA_REGEX);

  return (
    <div className="break-words min-w-0 space-y-2">
      {parts.map((part, i) => {
        if (MEDIA_REGEX.test(part)) {
          MEDIA_REGEX.lastIndex = 0;
          if (VIDEO_REGEX.test(part)) {
            return (
              <video
                key={i}
                src={part}
                controls
                className="rounded max-w-full max-h-96"
                preload="metadata"
              />
            );
          }
          return (
            <img
              key={i}
              src={part}
              alt=""
              className="rounded max-w-full max-h-96 object-contain"
              loading="lazy"
            />
          );
        }
        return part ? <span key={i}>{renderTextWithLinks(part, String(i))}</span> : null;
      })}
    </div>
  );
}
