function pubkeyToColor(pubkey: string): string {
  const hue = parseInt(pubkey.slice(0, 6), 16) % 360;
  return `hsl(${hue}, 55%, 62%)`;
}

interface Props {
  pubkey: string;
  picture?: string;
  size?: number;
}

export default function Avatar({ pubkey, picture, size = 32 }: Props) {
  if (picture) {
    return (
      <img
        src={picture}
        alt=""
        width={size}
        height={size}
        className="rounded-full shrink-0 object-cover"
        style={{ width: size, height: size }}
        onError={(e) => {
          const el = e.currentTarget;
          el.style.display = "none";
          el.nextElementSibling?.removeAttribute("style");
        }}
      />
    );
  }

  return (
    <div
      className="rounded-full shrink-0"
      style={{ backgroundColor: pubkeyToColor(pubkey), width: size, height: size }}
      title={pubkey}
    />
  );
}
