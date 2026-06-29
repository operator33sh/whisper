function pubkeyToColor(pubkey: string): string {
  const hue = parseInt(pubkey.slice(0, 6), 16) % 360;
  return `hsl(${hue}, 55%, 62%)`;
}

export default function Avatar({ pubkey }: { pubkey: string }) {
  const color = pubkeyToColor(pubkey);
  return (
    <div
      className="w-8 h-8 rounded-full shrink-0"
      style={{ backgroundColor: color }}
      title={pubkey}
    />
  );
}
