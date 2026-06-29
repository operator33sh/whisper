const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const THRESHOLDS: [number, Intl.RelativeTimeFormatUnit][] = [
  [60, "second"],
  [3600, "minute"],
  [86400, "hour"],
  [604800, "day"],
  [2592000, "week"],
  [31536000, "month"],
];

export function timeAgo(unixSeconds: number): string {
  const diff = unixSeconds - Math.floor(Date.now() / 1000);
  const abs = Math.abs(diff);

  for (let i = 0; i < THRESHOLDS.length; i++) {
    const [threshold, unit] = THRESHOLDS[i];
    const prevThreshold = i === 0 ? 1 : THRESHOLDS[i - 1][0];
    if (abs < threshold) {
      return rtf.format(Math.round(diff / prevThreshold), unit);
    }
  }

  return rtf.format(Math.round(diff / 31536000), "year");
}
