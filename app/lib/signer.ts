import { finalizeEvent, getPublicKey } from "nostr-tools";
import { decode } from "nostr-tools/nip19";
import type { EventTemplate, Event } from "nostr-tools";

declare global {
  interface Window {
    nostr?: {
      getPublicKey(): Promise<string>;
      signEvent(event: EventTemplate): Promise<Event>;
    };
  }
}

const NSEC_KEY = "whisper:nsec";
const PUBKEY_KEY = "whisper:pubkey";
const METHOD_KEY = "whisper:login-method";

export type LoginMethod = "nsec" | "nip07";

export function getLoginMethod(): LoginMethod | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(METHOD_KEY) as LoginMethod | null;
  if (stored) return stored;
  // backward compat: existing nsec users without login-method stored
  if (localStorage.getItem(NSEC_KEY)) return "nsec";
  return null;
}

export function getPubkey(): string | null {
  if (typeof window === "undefined") return null;
  const method = getLoginMethod();
  if (method === "nip07") {
    return localStorage.getItem(PUBKEY_KEY);
  }
  if (method === "nsec") {
    const nsec = localStorage.getItem(NSEC_KEY);
    if (!nsec) return null;
    try {
      const { type, data } = decode(nsec);
      if (type !== "nsec") return null;
      return getPublicKey(data as Uint8Array);
    } catch {
      return null;
    }
  }
  return null;
}

export async function signEvent(template: EventTemplate): Promise<Event> {
  const method = getLoginMethod();
  if (method === "nip07") {
    if (!window.nostr) throw new Error("NIP-07 extension not available");
    return window.nostr.signEvent(template);
  }
  if (method === "nsec") {
    const nsec = localStorage.getItem(NSEC_KEY);
    if (!nsec) throw new Error("Not logged in");
    const { type, data } = decode(nsec);
    if (type !== "nsec") throw new Error("Invalid nsec");
    return finalizeEvent(template, data as Uint8Array);
  }
  throw new Error("Not logged in");
}

export function clearLogin() {
  localStorage.removeItem(NSEC_KEY);
  localStorage.removeItem(PUBKEY_KEY);
  localStorage.removeItem(METHOD_KEY);
}
