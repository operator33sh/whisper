"use client";

import { useNsec } from "@/app/components/NsecGate";

export default function Shell({ children }: { children: React.ReactNode }) {
  const { logout } = useNsec();

  return (
    <div className="min-h-screen px-6 py-12 max-w-5xl mx-auto">
      <header className="flex items-center justify-between mb-10">
        <h1 className="text-4xl font-bold tracking-tight">Whisper</h1>
        <button
          onClick={logout}
          className="bg-black text-white text-sm px-4 py-2 rounded font-[family-name:var(--font-inter)] hover:bg-[#2d2d2d] transition-colors"
        >
          Logout
        </button>
      </header>
      <main>{children}</main>
    </div>
  );
}
