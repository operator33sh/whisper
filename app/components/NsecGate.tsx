"use client";

import { createContext, useContext, useState, useEffect } from "react";

const STORAGE_KEY = "whisper:nsec";

interface NsecContextValue {
  logout: () => void;
}

const NsecContext = createContext<NsecContextValue | null>(null);

export function useNsec() {
  const ctx = useContext(NsecContext);
  if (!ctx) throw new Error("useNsec must be used within NsecGate");
  return ctx;
}

export default function NsecGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) setUnlocked(true);
  }, []);

  function save() {
    const value = input.trim();
    if (!value) {
      setError(true);
      return;
    }
    localStorage.setItem(STORAGE_KEY, value);
    setUnlocked(true);
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setUnlocked(false);
    setInput("");
  }

  return (
    <NsecContext.Provider value={{ logout }}>
      {children}
      {!unlocked && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#f9f9f7] rounded-lg p-10 w-full max-w-md flex flex-col gap-6">
            <h2 className="text-2xl font-semibold">Enter your private key</h2>
            <div className="flex flex-col gap-1">
              <input
                type="password"
                value={input}
                onChange={(e) => { setInput(e.target.value); setError(false); }}
                onKeyDown={(e) => e.key === "Enter" && save()}
                placeholder="nsec..."
                className={`w-full border rounded px-4 py-2 text-sm font-[family-name:var(--font-inter)] bg-white focus:outline-none transition-colors ${
                  error
                    ? "border-red-500 focus:border-red-500"
                    : "border-[#2d2d2d]/30 focus:border-[#2d2d2d]"
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
              className="bg-black text-white text-sm px-4 py-2 rounded font-[family-name:var(--font-inter)] hover:bg-[#2d2d2d] transition-colors"
            >
              Connect
            </button>
          </div>
        </div>
      )}
    </NsecContext.Provider>
  );
}
