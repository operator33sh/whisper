const MEDIA_REGEX = /(https?:\/\/\S+\.(?:jpg|jpeg|png|gif|webp|avif|mp4|webm|mov|ogg)(?:\?\S*)?)/gi;
const VIDEO_REGEX = /\.(?:mp4|webm|mov|ogg)(?:\?|$)/i;

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
        return part ? <span key={i}>{part}</span> : null;
      })}
    </div>
  );
}
