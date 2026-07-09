"use client";

import { createContext, useContext, useState, useEffect, useRef } from "react";
import ThemeToggle from "@/app/components/ui/ThemeToggle";

const STORAGE_KEY = "whisper:nsec";

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
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function save() {
    const value = input.trim();
    if (!value) { setError(true); return; }
    localStorage.setItem(STORAGE_KEY, value);
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
            onChange={(e) => { setInput(e.target.value); setError(false); }}
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
              Please enter your private key.
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
    if (localStorage.getItem(STORAGE_KEY)) setUnlocked(true);
  }, []);

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setUnlocked(false);
  }

  return (
    <NsecContext.Provider value={{ unlocked, logout }}>
      {children}
      {!unlocked && <LoginModal onLogin={() => setUnlocked(true)} />}
    </NsecContext.Provider>
  );
}
