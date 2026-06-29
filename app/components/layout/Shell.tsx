"use client";

import { useNsec } from "@/app/components/NsecGate";

export default function Shell({ children }: { children: React.ReactNode }) {
  const { logout } = useNsec();

  return (
    <div className="h-screen flex flex-col px-6 max-w-5xl mx-auto">
      <header className="flex items-center justify-between py-8 shrink-0">
        <h1 className="text-4xl font-bold tracking-tight">Whisper</h1>
        <button
          onClick={logout}
          className="bg-black text-white text-sm px-4 py-2 rounded font-[family-name:var(--font-inter)] hover:bg-[#2d2d2d] transition-colors"
        >
          Logout
        </button>
      </header>
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
