import { SimplePool } from "nostr-tools";

export const RELAYS = [
  "wss://relay.sovereignresonance.org",
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.snort.social",
];

export const pool = new SimplePool();
