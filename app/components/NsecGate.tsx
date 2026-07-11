"use client";

import { createContext, useContext, useState, useEffect, useRef } from "react";
import { decode } from "nostr-tools/nip19";
import ThemeToggle from "@/app/components/ui/ThemeToggle";
import { clearLogin, getLoginMethod } from "@/app/lib/signer";

const NSEC_KEY = "whisper:nsec";
const PUBKEY_KEY = "whisper:pubkey";
const METHOD_KEY = "whisper:login-method";

interface NsecContextValue {
  unlocked: boolean;
  logout: () => void;
}

const NsecContext = createContext<NsecContextValue | null>(null);

export function useNsec() {
  const ctx = useContext(NsecContext);
  if (!ctx) throw new Error("useNsec must be used within NsecGate");
  return ctx;
}

function LoginModal({ onLogin }: { onLogin: () => void }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [extensionAvailable, setExtensionAvailable] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    // Check after a short delay — some extensions inject window.nostr late
    const check = () => setExtensionAvailable(typeof window !== "undefined" && !!window.nostr);
    check();
    const t = setTimeout(check, 500);
    return () => clearTimeout(t);
  }, []);

  async function loginWithExtension() {
    if (!window.nostr) { setError("No Nostr extension found. Install Alby or similar."); return; }
    try {
      const pubkey = await window.nostr.getPublicKey();
      try {
        localStorage.setItem(PUBKEY_KEY, pubkey);
        localStorage.setItem(METHOD_KEY, "nip07");
      } catch {
        setError("Could not save login — check browser storage settings.");
        return;
      }
      onLogin();
    } catch {
      setError("Extension login cancelled or failed.");
    }
  }

  function save() {
    const value = input.trim();
    if (!value) { setError("Please enter your private key."); return; }
    try {
      const { type } = decode(value);
      if (type !== "nsec") { setError("Invalid format — use an nsec key (starts with nsec1)."); return; }
    } catch {
      setError("Invalid format — use an nsec key (starts with nsec1).");
      return;
    }
    try {
      localStorage.setItem(NSEC_KEY, value);
      localStorage.setItem(METHOD_KEY, "nsec");
    } catch {
      setError("Could not save — check browser storage settings.");
      return;
    }
    onLogin();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="bg-bg text-ink rounded-lg p-10 w-full max-w-md flex flex-col gap-6">
        <div className="flex justify-center text-ink">
          <svg viewBox="0 0 360 96" className="h-16 w-auto" role="img" aria-label="Whisper">
            <path
              d="M10 48 C 15.5 27, 22.5 27, 28 48 C 32.5 63, 39 63, 44 48 C 47.5 38, 53 38, 57 48 C 59.5 54, 64 54, 67 48 C 68.8 44.8, 71.8 44.8, 73.5 48 L 85 48"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <text
              x="106"
              y="62"
              fill="currentColor"
              style={{ fontFamily: "var(--font-crimson), Georgia, serif", fontWeight: 300, fontSize: "46px", letterSpacing: "0.05em" }}
            >
              Whisper
            </text>
          </svg>
        </div>

        {extensionAvailable && (
          <button
            onClick={loginWithExtension}
            className="flex items-center justify-center gap-2 w-full border border-line-strong text-sm px-4 py-2.5 rounded font-[family-name:var(--font-inter)] hover:opacity-80 transition-opacity"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            Login with Extension
          </button>
        )}

        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Enter your private key</h2>
          <a
            href="https://start.nostr.net/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-ink-soft hover:text-ink transition-colors font-[family-name:var(--font-inter)]"
          >
            Register
          </a>
        </div>
        <div className="flex flex-col gap-1">
          <input
            ref={inputRef}
            type="password"
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder="nsec..."
            className={`w-full border rounded px-4 py-2 text-sm font-[family-name:var(--font-inter)] bg-surface text-ink placeholder:text-ink-faint focus:outline-none transition-colors ${
              error
                ? "border-red-500 focus:border-red-500"
                : "border-line-strong focus:border-ink"
            }`}
          />
          {error && (
            <span className="text-red-500 text-xs font-[family-name:var(--font-inter)]">
              {error}
            </span>
          )}
        </div>
        <button
          onClick={save}
          className="bg-ink text-bg text-sm px-4 py-2 rounded font-[family-name:var(--font-inter)] hover:opacity-90 transition-opacity"
        >
          Connect
        </button>
      </div>
    </div>
  );
}

export default function NsecGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    const method = getLoginMethod();
    if (method === "nsec" && localStorage.getItem(NSEC_KEY)) setUnlocked(true);
    if (method === "nip07" && localStorage.getItem(PUBKEY_KEY)) setUnlocked(true);
  }, []);

  function logout() {
    clearLogin();
    setUnlocked(false);
  }

  return (
    <NsecContext.Provider value={{ unlocked, logout }}>
      {children}
      {!unlocked && <LoginModal onLogin={() => setUnlocked(true)} />}
    </NsecContext.Provider>
  );
}
