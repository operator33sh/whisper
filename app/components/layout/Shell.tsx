"use client";

import { useEffect, useRef, useState } from "react";
import { useNsec } from "@/app/components/NsecGate";
import NewPostButton from "@/app/components/ui/NewPostButton";
import { useFollows, getNsecPubkey } from "@/app/hooks/useFollows";
import { useNostrContext } from "@/app/components/NostrProvider";
import { useMissionControl } from "@/app/hooks/useMissionControl";
import { useRelays } from "@/app/hooks/useRelays";
import { useFollowedHashtags } from "@/app/hooks/useFollowedHashtags";
import RelaySettings from "@/app/components/settings/RelaySettings";
import Avatar from "@/app/components/ui/Avatar";
import ProfileModal from "@/app/components/ui/ProfileModal";
import SearchResults from "@/app/components/ui/SearchResults";
import { useProfiles } from "@/app/hooks/useProfiles";

export default function Shell({ children }: { children: React.ReactNode }) {
  const { unlocked, logout } = useNsec();
  const { pool } = useNostrContext();
  const loadFollows = useFollows((s) => s.loadFollows);
  const { activeView, setView, hasPendingMentions } = useMissionControl();
  const initRelays = useRelays((s) => s.initRelays);
  const initFollowedHashtags = useFollowedHashtags((s) => s.initFollowedHashtags);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const profiles = useProfiles((s) => s.profiles);
  const fetchProfiles = useProfiles((s) => s.fetchProfiles);
  const myPubkey = unlocked ? getNsecPubkey() : null;
  const myProfile = myPubkey ? profiles.get(myPubkey) : undefined;

  useEffect(() => { initRelays(); }, [initRelays]);
  useEffect(() => { initFollowedHashtags(); }, [initFollowedHashtags]);

  useEffect(() => {
    if (!unlocked) return;
    const pubkey = getNsecPubkey();
    if (!pubkey) return;
    loadFollows(pool, pubkey);
    fetchProfiles(pool, [pubkey]);
  }, [pool, loadFollows, fetchProfiles, unlocked]);

  // Focus input when search opens
  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  // Close search on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && searchOpen) closeSearch();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen]);

  function closeSearch() {
    setSearchOpen(false);
    setSearchQuery("");
    setDebouncedSearch("");
  }

  return (
    <div className="h-screen flex">
      {/* Left navigation rail */}
      <aside className="fixed left-0 top-0 h-screen w-12 bg-[#f9f9f7]/90 backdrop-blur-sm border-r border-[#2d2d2d]/10 flex flex-col items-center pt-8 gap-8 z-20">
        <button
          onClick={() => { setView("feed"); closeSearch(); }}
          title="Whisper"
          style={{ fontFamily: "var(--font-crimson)" }}
          className={`text-lg transition-opacity select-none p-2 ${
            activeView === "feed" ? "opacity-100" : "opacity-25 hover:opacity-60"
          }`}
        >
          W
        </button>
        <button
          onClick={() => { setView("mission-control"); closeSearch(); }}
          title="Mission Control"
          style={{ writingMode: "vertical-rl", letterSpacing: "0.12em" }}
          className={`text-[10px] uppercase font-[family-name:var(--font-inter)] select-none p-2 ${
            activeView === "mission-control"
              ? "opacity-100"
              : hasPendingMentions
              ? "animate-sacred-glow"
              : "opacity-25 hover:opacity-60 transition-opacity"
          }`}
        >
          control
        </button>
        <button
          onClick={() => { setView("hashtag-feeds"); closeSearch(); }}
          title="Feeds"
          style={{ writingMode: "vertical-rl", letterSpacing: "0.12em" }}
          className={`text-[10px] uppercase font-[family-name:var(--font-inter)] select-none p-2 ${
            activeView === "hashtag-feeds" ? "opacity-100" : "opacity-25 hover:opacity-60 transition-opacity"
          }`}
        >
          feeds
        </button>

        <button
          onClick={() => setSettingsOpen(true)}
          title="Settings"
          className="mt-auto p-2 text-base text-[#2d2d2d]/30 hover:text-[#2d2d2d] transition-colors select-none font-[family-name:var(--font-inter)]"
        >
          ⚙
        </button>
        {myPubkey && (
          <button
            onClick={() => setProfileOpen(true)}
            title="My profile"
            className="mb-4 rounded-full opacity-70 hover:opacity-100 transition-opacity"
          >
            <Avatar pubkey={myPubkey} picture={myProfile?.picture} size={28} />
          </button>
        )}
      </aside>

      {/* Main content */}
      <div className="ml-12 flex-1 flex flex-col min-w-0">
        <div className="h-full flex flex-col px-6 w-[928px] mx-auto">
          <header className="flex items-center justify-between py-8 shrink-0">
            <div className="flex items-center gap-4">
              <h1><img src="/whisper-logo.svg" alt="Whisper" className="h-14" /></h1>
              {activeView === "feed" && !searchOpen && <div className="-mt-1 -ml-2"><NewPostButton /></div>}

              {/* Magnifying glass + sliding search bar */}
              <div className="flex items-center gap-2 -mt-1">
                <button
                  onClick={() => searchOpen ? closeSearch() : setSearchOpen(true)}
                  title="Search"
                  className={`transition-colors ${searchOpen ? "text-[#2d2d2d]" : "text-[#2d2d2d]/30 hover:text-[#2d2d2d]"}`}
                  aria-label="Search"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </button>

                <div
                  className="overflow-hidden transition-all duration-300 ease-out"
                  style={{ width: searchOpen ? "220px" : "0px" }}
                >
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Nostr…"
                    className="w-full bg-transparent text-sm font-[family-name:var(--font-inter)] text-[#2d2d2d] placeholder:text-[#2d2d2d]/30 outline-none border-b border-[#2d2d2d]/20 pb-0.5"
                  />
                </div>

                {searchOpen && (
                  <button
                    onClick={closeSearch}
                    className="text-[#2d2d2d]/30 hover:text-[#2d2d2d] transition-colors text-sm leading-none"
                    aria-label="Close search"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={logout}
              className="bg-black text-white text-xs px-3 py-1.5 rounded font-[family-name:var(--font-inter)] hover:bg-[#2d2d2d] transition-colors"
            >
              Logout
            </button>
          </header>
          <main className="flex-1 overflow-hidden">
            <div className={`h-full ${searchOpen && debouncedSearch ? "hidden" : ""}`}>
              {children}
            </div>
            {searchOpen && debouncedSearch && (
              <div className="h-full">
                <SearchResults query={debouncedSearch} />
              </div>
            )}
          </main>
        </div>
      </div>

      {settingsOpen && <RelaySettings onClose={() => setSettingsOpen(false)} />}
      {profileOpen && myPubkey && <ProfileModal pubkey={myPubkey} onClose={() => setProfileOpen(false)} isSelf />}

      <footer className="fixed bottom-0 left-12 right-0 py-2 bg-[#f9f9f7] pointer-events-none">
        <div className="w-[928px] mx-auto px-6 text-right">
          <p className="text-[10px] text-[#2d2d2d] font-[family-name:var(--font-inter)]">
            Email: <span className="pointer-events-auto">operator33.sh@proton.me</span>
            {" · "}
            Support Whisper:{" "}
            <span className="pointer-events-auto select-text">bitcoincash:qq3u8k4afsw35rcrnkg6vaf20et57fsdd5n9r5g0py</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
