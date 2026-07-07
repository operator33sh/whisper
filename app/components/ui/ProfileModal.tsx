"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNostrContext } from "@/app/components/NostrProvider";
import { useProfiles } from "@/app/hooks/useProfiles";
import { useFollows, getNsecPubkey } from "@/app/hooks/useFollows";
import { useRelays } from "@/app/hooks/useRelays";
import Avatar from "@/app/components/ui/Avatar";
import ProfileFeed from "@/app/components/ui/ProfileFeed";
import { npubEncode } from "nostr-tools/nip19";
import { finalizeEvent } from "nostr-tools";
import { decode } from "nostr-tools/nip19";

const STORAGE_KEY = "whisper:nsec";

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

function renderAbout(text: string) {
  return text.split(URL_REGEX).map((part, i) => {
    if (URL_REGEX.test(part)) {
      URL_REGEX.lastIndex = 0;
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#2d2d2d]/50 hover:text-[#2d2d2d] transition-colors"
        >
          {part}
        </a>
      );
    }
    return part || null;
  });
}

interface Props {
  pubkey: string;
  onClose: () => void;
  isSelf?: boolean;
}

function useNostrUpload() {
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function upload(file: File, onSuccess: (url: string) => void) {
    const nsec = localStorage.getItem(STORAGE_KEY);
    if (!nsec) { setError("Not logged in."); return; }
    const { type, data: privateKey } = decode(nsec);
    if (type !== "nsec") { setError("Invalid nsec."); return; }

    const uploadUrl = "https://nostr.build/api/v2/upload/files";
    const authEvent = finalizeEvent(
      {
        kind: 27235,
        created_at: Math.floor(Date.now() / 1000),
        tags: [["u", uploadUrl], ["method", "POST"]],
        content: "",
      },
      privateKey as Uint8Array
    );
    const authHeader = "Nostr " + btoa(JSON.stringify(authEvent));

    setError(null);
    setProgress(0);

    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("fileToUpload", file);

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 100));
    };
    xhr.onload = () => {
      setProgress(null);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const json = JSON.parse(xhr.responseText);
          const url: string = json?.data?.[0]?.url;
          if (!url) throw new Error("No URL");
          onSuccess(url);
        } catch {
          setError("Upload succeeded but no URL returned.");
        }
      } else {
        setError("Upload failed. Please try again.");
      }
    };
    xhr.onerror = () => { setProgress(null); setError("Upload failed. Please try again."); };

    xhr.open("POST", uploadUrl);
    xhr.setRequestHeader("Authorization", authHeader);
    xhr.send(formData);
  }

  return { upload, progress, error, setError };
}

function FollowerRow({ followerPubkey, onOpenProfile }: { followerPubkey: string; onOpenProfile: (pk: string) => void }) {
  const { pool } = useNostrContext();
  const profiles = useProfiles((s) => s.profiles);
  const follows = useFollows((s) => s.follows);
  const follow = useFollows((s) => s.follow);
  const unfollow = useFollows((s) => s.unfollow);
  const [pending, setPending] = useState(false);

  const profile = profiles.get(followerPubkey);
  const name = profile?.display_name || profile?.name || npubEncode(followerPubkey).slice(0, 16) + "…";
  const isFollowing = follows.includes(followerPubkey);
  const ownPubkey = getNsecPubkey();
  const isSelfRow = ownPubkey === followerPubkey;

  async function toggleFollow() {
    setPending(true);
    try {
      if (isFollowing) await unfollow(pool, followerPubkey);
      else await follow(pool, followerPubkey);
    } catch (e) {
      console.error("[FollowerRow]", e);
    } finally {
      setPending(false);
    }
  }

  return (
    <li className="flex items-center justify-between gap-3 py-2.5 px-1">
      <button
        type="button"
        onClick={() => onOpenProfile(followerPubkey)}
        className="flex items-center gap-3 min-w-0 hover:opacity-70 transition-opacity text-left"
      >
        <Avatar pubkey={followerPubkey} picture={profile?.picture} size={32} />
        <span className="text-sm font-[family-name:var(--font-inter)] truncate">{name}</span>
      </button>
      {!isSelfRow && (
        <button
          onClick={toggleFollow}
          disabled={pending}
          className={`text-xs px-3 py-1 rounded font-[family-name:var(--font-inter)] shrink-0 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            isFollowing
              ? "bg-white text-[#2d2d2d] border border-[#2d2d2d] hover:bg-[#f0f0ee]"
              : "bg-black text-white hover:bg-[#2d2d2d]"
          }`}
        >
          {pending ? "…" : isFollowing ? "Unfollow" : "Follow"}
        </button>
      )}
    </li>
  );
}

export default function ProfileModal({ pubkey, onClose, isSelf }: Props) {
  const { pool } = useNostrContext();
  const relays = useRelays((s) => s.relays);
  const profiles = useProfiles((s) => s.profiles);
  const fetchProfiles = useProfiles((s) => s.fetchProfiles);
  const setProfile = useProfiles((s) => s.setProfile);
  const follows = useFollows((s) => s.follows);
  const follow = useFollows((s) => s.follow);
  const unfollow = useFollows((s) => s.unfollow);
  const [pending, setPending] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  const [editName, setEditName] = useState("");
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editAbout, setEditAbout] = useState("");
  const [editPicture, setEditPicture] = useState("");
  const [editBanner, setEditBanner] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const avatarUpload = useNostrUpload();
  const bannerUpload = useNostrUpload();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const [showFollowers, setShowFollowers] = useState(false);
  const [followerPubkeys, setFollowerPubkeys] = useState<string[]>([]);
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  const [openedFollowerPubkey, setOpenedFollowerPubkey] = useState<string | null>(null);

  function openFollowers() {
    setShowFollowers(true);
    setLoadingFollowers(true);
    setFollowerPubkeys([]);
    const seen = new Set<string>();
    const sub = pool.subscribeMany(relays, [{ kinds: [3], "#p": [pubkey] }], {
      onevent(event) {
        if (!seen.has(event.pubkey)) {
          seen.add(event.pubkey);
          setFollowerPubkeys((prev) => [...prev, event.pubkey]);
        }
      },
      oneose() {
        setLoadingFollowers(false);
        sub.close();
        if (seen.size > 0) fetchProfiles(pool, [...seen]);
      },
    });
  }

  useEffect(() => {
    fetchProfiles(pool, [pubkey]);
  }, [pool, pubkey, fetchProfiles]);

  const profile = profiles.get(pubkey);
  const name = profile?.display_name || profile?.name || npubEncode(pubkey).slice(0, 20) + "…";
  const npub = npubEncode(pubkey);
  const isFollowing = follows.includes(pubkey);

  function openEdit() {
    setEditName(profile?.name || "");
    setEditDisplayName(profile?.display_name || "");
    setEditAbout(profile?.about || "");
    setEditPicture(profile?.picture || "");
    setEditBanner(profile?.banner || "");
    setEditWebsite(profile?.website || "");
    avatarUpload.setError(null);
    bannerUpload.setError(null);
    setSaveError(null);
    setEditing(true);
  }

  async function toggleFollow() {
    setPending(true);
    try {
      if (isFollowing) await unfollow(pool, pubkey);
      else await follow(pool, pubkey);
    } catch (e) {
      console.error("[ProfileModal]", e);
    } finally {
      setPending(false);
    }
  }

  async function saveProfile() {
    const nsec = localStorage.getItem(STORAGE_KEY);
    if (!nsec) { setSaveError("Not logged in."); return; }
    const { type, data: privateKey } = decode(nsec);
    if (type !== "nsec") { setSaveError("Invalid nsec."); return; }

    setSaving(true);
    setSaveError(null);

    try {
      const updatedProfile = {
        name: editName,
        display_name: editDisplayName,
        about: editAbout,
        picture: editPicture,
        banner: editBanner,
        website: editWebsite,
      };

      const event = finalizeEvent(
        {
          kind: 0,
          created_at: Math.floor(Date.now() / 1000),
          tags: [],
          content: JSON.stringify(updatedProfile),
        },
        privateKey as Uint8Array
      );

      await Promise.any(pool.publish(relays, event));
      setProfile(pubkey, updatedProfile);
      setEditing(false);
    } catch (e) {
      console.error("[ProfileModal] save failed:", e);
      setSaveError("Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
    {openedFollowerPubkey && createPortal(
      <ProfileModal
        pubkey={openedFollowerPubkey}
        onClose={() => setOpenedFollowerPubkey(null)}
      />,
      document.body
    )}
    {photoOpen && profile?.picture && createPortal(
      <div
        className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70]"
        onClick={() => setPhotoOpen(false)}
      >
        <img
          src={profile.picture}
          alt=""
          className="max-w-[90vw] max-h-[90vh] rounded-lg object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      </div>,
      document.body
    )}
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-[#f9f9f7] rounded-lg w-full max-w-lg overflow-hidden"
        style={{ height: "836px", maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
      >

        {!showFollowers && !editing && (
          /* ── Profile view panel ── */
          <div className="flex flex-col h-full">
            {/* Banner */}
            <div className="h-28 bg-[#e8e8e5] rounded-t-lg overflow-hidden shrink-0">
              {profile?.banner && (
                <img src={profile.banner} alt="" className="w-full h-full object-cover" />
              )}
            </div>

            <div className="p-8 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => profile?.picture && setPhotoOpen(true)}
                    className={profile?.picture ? "cursor-pointer" : "cursor-default"}
                    aria-label="View profile picture"
                  >
                    <Avatar pubkey={pubkey} picture={profile?.picture} size={48} />
                  </button>
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-lg leading-tight truncate">{name}</span>
                    <span className="text-xs text-[#2d2d2d]/40 font-[family-name:var(--font-inter)] truncate">
                      {npub.slice(0, 24)}…
                    </span>
                  </div>
                </div>
                {isSelf && (
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <button
                      onClick={openFollowers}
                      className="text-xs px-3 py-1.5 rounded border border-[#2d2d2d] bg-white text-[#2d2d2d] font-[family-name:var(--font-inter)] hover:bg-[#f0f0ee] transition-colors"
                    >
                      Followers
                    </button>
                    <button
                      onClick={openEdit}
                      className="text-xs px-3 py-1.5 rounded border border-[#2d2d2d] bg-white text-[#2d2d2d] font-[family-name:var(--font-inter)] hover:bg-[#f0f0ee] transition-colors"
                    >
                      Edit profile
                    </button>
                  </div>
                )}
              </div>

              {profile?.about && (
                <p className="text-sm text-[#2d2d2d]/70 leading-relaxed max-h-24 overflow-y-scroll pr-1 whitespace-pre-wrap">{renderAbout(profile.about)}</p>
              )}

              {profile?.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#2d2d2d]/50 hover:text-[#2d2d2d] transition-colors font-[family-name:var(--font-inter)] truncate"
                >
                  {profile.website}
                </a>
              )}

              <div className="h-px bg-gradient-to-r from-transparent via-[#2d2d2d]/20 to-transparent" />
              <ProfileFeed pubkey={pubkey} />

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="text-sm px-4 py-2 font-[family-name:var(--font-inter)] text-[#2d2d2d]/60 hover:text-[#2d2d2d] transition-colors"
                >
                  Close
                </button>
                {!isSelf && (
                  <button
                    onClick={toggleFollow}
                    disabled={pending}
                    className={`text-sm px-4 py-2 rounded font-[family-name:var(--font-inter)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      isFollowing
                        ? "bg-white text-[#2d2d2d] border border-[#2d2d2d] hover:bg-[#f0f0ee]"
                        : "bg-black text-white hover:bg-[#2d2d2d]"
                    }`}
                  >
                    {pending ? "…" : isFollowing ? "Unfollow" : "Follow"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {showFollowers && (
          /* ── Followers panel ── */
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-3 px-8 pt-7 pb-4 shrink-0">
              <button
                onClick={() => setShowFollowers(false)}
                className="text-[#2d2d2d]/40 hover:text-[#2d2d2d] transition-colors"
                aria-label="Back"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 5l-7 7 7 7"/>
                </svg>
              </button>
              <h3 className="text-sm font-semibold font-[family-name:var(--font-inter)]">Followers</h3>
            </div>
            <div className="h-px bg-gradient-to-r from-transparent via-[#2d2d2d]/20 to-transparent mx-8 shrink-0" />
            <div className="flex-1 overflow-y-auto px-7" onWheel={(e) => e.stopPropagation()}>
              {loadingFollowers && followerPubkeys.length === 0 && (
                <p className="text-sm text-[#2d2d2d]/40 font-[family-name:var(--font-inter)] py-6 text-center">Loading…</p>
              )}
              {!loadingFollowers && followerPubkeys.length === 0 && (
                <p className="text-sm text-[#2d2d2d]/40 font-[family-name:var(--font-inter)] py-6 text-center">No followers yet.</p>
              )}
              {followerPubkeys.length > 0 && (
                <ul className="divide-y divide-[#2d2d2d]/10">
                  {followerPubkeys.map((pk) => (
                    <FollowerRow key={pk} followerPubkey={pk} onOpenProfile={setOpenedFollowerPubkey} />
                  ))}
                </ul>
              )}
            </div>
            <div className="flex justify-end px-8 py-4 shrink-0">
              <button
                onClick={() => setShowFollowers(false)}
                className="text-sm px-4 py-2 font-[family-name:var(--font-inter)] text-[#2d2d2d]/60 hover:text-[#2d2d2d] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {!showFollowers && editing && (
          /* ── Edit panel ── */
          <div className="flex flex-col h-full">
            {/* Banner upload */}
            <div className="relative h-28 bg-[#e8e8e5] rounded-t-lg overflow-hidden shrink-0 group">
              {editBanner && (
                <img src={editBanner} alt="" className="w-full h-full object-cover" />
              )}
              <button
                type="button"
                onClick={() => bannerInputRef.current?.click()}
                disabled={bannerUpload.progress !== null}
                className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-30"
                aria-label="Change banner"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                </svg>
              </button>
              {bannerUpload.progress !== null && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/30">
                  <div className="h-full bg-white transition-all duration-150" style={{ width: `${bannerUpload.progress}%` }} />
                </div>
              )}
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) { e.target.value = ""; bannerUpload.upload(file, setEditBanner); }
                }}
              />
            </div>
            {bannerUpload.error && (
              <span className="px-8 pt-1 text-red-500 text-xs font-[family-name:var(--font-inter)]">{bannerUpload.error}</span>
            )}

            <div className="p-8 flex flex-col gap-4 overflow-y-auto max-h-[60vh]">
              <h3 className="text-base font-semibold font-[family-name:var(--font-inter)]">Edit profile</h3>

              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <Avatar pubkey={pubkey} picture={editPicture || undefined} size={48} />
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={avatarUpload.progress !== null}
                    className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-30"
                    aria-label="Change avatar"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                    </svg>
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) { e.target.value = ""; avatarUpload.upload(file, setEditPicture); }
                    }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-[#2d2d2d]/50 font-[family-name:var(--font-inter)]">Profile picture</span>
                  {avatarUpload.progress !== null && (
                    <div className="flex items-center gap-2">
                      <div className="h-0.5 w-24 bg-[#2d2d2d]/10 rounded-full overflow-hidden">
                        <div className="h-full bg-[#2d2d2d] transition-all duration-150" style={{ width: `${avatarUpload.progress}%` }} />
                      </div>
                      <span className="text-xs text-[#2d2d2d]/50 font-[family-name:var(--font-inter)]">{avatarUpload.progress}%</span>
                    </div>
                  )}
                  {avatarUpload.error && <span className="text-red-500 text-xs font-[family-name:var(--font-inter)]">{avatarUpload.error}</span>}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[#2d2d2d]/50 font-[family-name:var(--font-inter)]">Display name</label>
                  <input
                    type="text"
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    className="border border-[#2d2d2d]/30 rounded px-3 py-1.5 text-sm font-[family-name:var(--font-inter)] bg-white focus:outline-none focus:border-[#2d2d2d]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[#2d2d2d]/50 font-[family-name:var(--font-inter)]">Username</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="border border-[#2d2d2d]/30 rounded px-3 py-1.5 text-sm font-[family-name:var(--font-inter)] bg-white focus:outline-none focus:border-[#2d2d2d]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[#2d2d2d]/50 font-[family-name:var(--font-inter)]">Bio</label>
                  <textarea
                    value={editAbout}
                    onChange={(e) => setEditAbout(e.target.value)}
                    rows={3}
                    className="border border-[#2d2d2d]/30 rounded px-3 py-1.5 text-sm font-[family-name:var(--font-inter)] bg-white focus:outline-none focus:border-[#2d2d2d] resize-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[#2d2d2d]/50 font-[family-name:var(--font-inter)]">Website</label>
                  <input
                    type="url"
                    value={editWebsite}
                    onChange={(e) => setEditWebsite(e.target.value)}
                    placeholder="https://"
                    className="border border-[#2d2d2d]/30 rounded px-3 py-1.5 text-sm font-[family-name:var(--font-inter)] bg-white focus:outline-none focus:border-[#2d2d2d]"
                  />
                </div>
              </div>

              {saveError && <span className="text-red-500 text-xs font-[family-name:var(--font-inter)]">{saveError}</span>}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setEditing(false)}
                  className="text-sm px-4 py-2 font-[family-name:var(--font-inter)] text-[#2d2d2d]/60 hover:text-[#2d2d2d] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveProfile}
                  disabled={saving || avatarUpload.progress !== null || bannerUpload.progress !== null}
                  className="bg-black text-white text-sm px-4 py-2 rounded font-[family-name:var(--font-inter)] hover:bg-[#2d2d2d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
