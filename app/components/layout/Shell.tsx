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
import ThemeToggle from "@/app/components/ui/ThemeToggle";
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
      <aside className="fixed left-0 top-0 h-screen w-16 bg-transparent border-r-[0.5px] border-line flex flex-col items-center pt-10 gap-7 z-20">
        <button
          onClick={() => { setView("feed"); closeSearch(); }}
          title="Whisper"
          className={`p-2 transition-colors select-none ${
            activeView === "feed" ? "text-ink" : "text-ink-faint hover:text-ink"
          }`}
        >
          <svg viewBox="0 0 96 96" width="30" height="30" role="img" aria-label="Whisper">
            <path
              d="M6 48 C 12 25, 20 25, 26 48 C 31 65, 38 65, 44 48 C 48 37, 54 37, 58 48 C 61 55, 66 55, 69 48 C 71 44.5, 74.5 44.5, 76.5 48 L 90 48"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          onClick={() => { setView("mission-control"); closeSearch(); }}
          title="Mission Control"
          className={`p-2 select-none ${
            activeView === "mission-control"
              ? "text-ink"
              : hasPendingMentions
              ? "text-ink animate-sacred-glow-icon"
              : "text-ink-faint hover:text-ink transition-colors"
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
            <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" />
            <circle cx="12" cy="12" r="2" />
            <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" />
            <path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1" />
          </svg>
        </button>
        <button
          onClick={() => { setView("hashtag-feeds"); closeSearch(); }}
          title="Feeds"
          className={`p-2 select-none transition-colors ${
            activeView === "hashtag-feeds" ? "text-ink" : "text-ink-faint hover:text-ink"
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="9" x2="20" y2="9" />
            <line x1="4" y1="15" x2="20" y2="15" />
            <line x1="10" y1="3" x2="8" y2="21" />
            <line x1="16" y1="3" x2="14" y2="21" />
          </svg>
        </button>

        <div className="mt-auto flex flex-col items-center">
          <ThemeToggle />
          <button
            onClick={() => setSettingsOpen(true)}
            title="Settings"
            className="p-2 text-base text-ink-faint hover:text-ink transition-colors select-none font-[family-name:var(--font-inter)]"
          >
            ⚙
          </button>
        </div>
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
      <div className="ml-16 flex-1 flex flex-col min-w-0">
        <div className="h-full flex flex-col px-6 w-[928px] mx-auto">
          <header className="flex items-center justify-between py-8 shrink-0">
            <div className="flex items-center gap-4">
              <h1 className="text-ink">
                <svg viewBox="0 0 360 96" className="h-14 w-auto" role="img" aria-label="Whisper">
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
              </h1>
              {activeView === "feed" && !searchOpen && <div className="-mt-1 -ml-2"><NewPostButton /></div>}

              {/* Magnifying glass + sliding search bar */}
              <div className="flex items-center gap-2 -mt-1">
                <button
                  onClick={() => searchOpen ? closeSearch() : setSearchOpen(true)}
                  title="Search"
                  className={`transition-colors ${searchOpen ? "text-ink" : "text-ink-faint hover:text-ink"}`}
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
                    className="w-full bg-transparent text-sm font-[family-name:var(--font-inter)] text-ink placeholder:text-ink-faint outline-none border-b border-line-strong pb-0.5"
                  />
                </div>

                {searchOpen && (
                  <button
                    onClick={closeSearch}
                    className="text-ink-faint hover:text-ink transition-colors text-sm leading-none"
                    aria-label="Close search"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={logout}
              className="text-xs text-ink-faint hover:text-ink-soft transition-colors font-[family-name:var(--font-inter)]"
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

      <footer className="fixed bottom-0 left-16 right-0 py-2 bg-bg pointer-events-none [transition:background-color_0.8s_ease,color_0.8s_ease]">
        <div className="w-[928px] mx-auto px-6 text-center">
          <p className="text-[10px] text-ink-faint font-[family-name:var(--font-inter)]">
            <span className="pointer-events-auto select-text">operator33.sh@proton.me</span>
            {" · "}
            <span className="pointer-events-auto select-text">bitcoincash:qq3u8k4afsw35rcrnkg6vaf20et57fsdd5n9r5g0py</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
