"use client";

import { useRef, useState } from "react";
import { useNostrContext } from "@/app/components/NostrProvider";
import { useRelays } from "@/app/hooks/useRelays";
import { useOptimisticReplyCounts } from "@/app/hooks/useOptimisticReplyCounts";
import { finalizeEvent } from "nostr-tools";
import { decode } from "nostr-tools/nip19";
import EmojiPicker from "@/app/components/ui/EmojiPicker";

const UPLOAD_URL = "https://nostr.build/api/v2/upload/files";

const STORAGE_KEY = "whisper:nsec";

interface Props {
  eventId: string;
  eventPubkey: string;
  rootEventId?: string;
}

export default function ReplyButton({ eventId, eventPubkey, rootEventId }: Props) {
  const { pool } = useNostrContext();
  const relays = useRelays((s) => s.relays);
  const increment = useOptimisticReplyCounts((s) => s.increment);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleEmojiSelect(emoji: string) {
    const ta = textareaRef.current;
    if (!ta) { setText((prev) => prev + emoji); return; }
    const start = ta.selectionStart ?? text.length;
    const end = ta.selectionEnd ?? text.length;
    const next = text.slice(0, start) + emoji + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = start + emoji.length;
      ta.focus();
    });
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const nsec = localStorage.getItem(STORAGE_KEY);
    if (!nsec) { setUploadError("Not logged in."); return; }
    const { type, data: privateKey } = decode(nsec);
    if (type !== "nsec") { setUploadError("Invalid nsec."); return; }

    const authEvent = finalizeEvent(
      {
        kind: 27235,
        created_at: Math.floor(Date.now() / 1000),
        tags: [["u", UPLOAD_URL], ["method", "POST"]],
        content: "",
      },
      privateKey as Uint8Array
    );
    const authHeader = "Nostr " + btoa(JSON.stringify(authEvent));

    setUploadError(null);
    setUploadProgress(0);

    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("fileToUpload", file);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        setUploadProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      setUploadProgress(null);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const json = JSON.parse(xhr.responseText);
          const url: string = json?.data?.[0]?.url;
          if (!url) throw new Error("No URL in response");
          setText((prev) => (prev ? `${prev}\n${url}` : url));
        } catch {
          setUploadError("Upload succeeded but no URL was returned.");
        }
      } else {
        console.error("[upload] status:", xhr.status, "response:", xhr.responseText);
        try {
          const json = JSON.parse(xhr.responseText);
          const msg = json?.message || json?.error || "Upload failed. Please try again.";
          setUploadError(msg);
        } catch {
          setUploadError("Upload failed. Please try again.");
        }
      }
    };

    xhr.onerror = () => {
      setUploadProgress(null);
      setUploadError("Upload failed. Please try again.");
    };

    xhr.open("POST", UPLOAD_URL);
    xhr.setRequestHeader("Authorization", authHeader);
    xhr.send(formData);
  }

  async function submit() {
    const nsec = localStorage.getItem(STORAGE_KEY);
    if (!nsec) { setError("Not logged in"); return; }

    const { type, data: privateKey } = decode(nsec);
    if (type !== "nsec") { setError("Invalid nsec"); return; }

    const content = text.trim();
    if (!content) return;

    setSending(true);
    setError(null);

    try {
      const event = finalizeEvent(
        {
          kind: 1,
          created_at: Math.floor(Date.now() / 1000),
          tags: rootEventId && rootEventId !== eventId
            ? [["e", rootEventId, "", "root"], ["e", eventId, "", "reply"], ["p", eventPubkey]]
            : [["e", eventId, "", "root"], ["p", eventPubkey]],
          content,
        },
        privateKey as Uint8Array
      );

      await Promise.any(pool.publish(relays, event));
      increment(eventId);
      setText("");
      setOpen(false);
    } catch (e) {
      console.error("[ReplyButton] publish failed:", e);
      setError("Failed to send. Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-[#2d2d2d]/50 hover:text-[#2d2d2d] transition-colors font-[family-name:var(--font-inter)]"
      >
        Reply
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#f9f9f7] rounded-lg p-8 w-full max-w-md flex flex-col gap-4">
            <h2 className="text-xl font-semibold">Reply</h2>
            <div className="relative">
              <textarea
                ref={textareaRef}
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Write your reply…"
                rows={4}
                className="w-full border border-[#2d2d2d]/30 rounded px-4 py-2 text-sm font-[family-name:var(--font-inter)] bg-white focus:outline-none focus:border-[#2d2d2d] resize-none"
              />
              <button
                type="button"
                onClick={() => setEmojiOpen((v) => !v)}
                className="absolute bottom-2 right-9 text-[#2d2d2d]/40 hover:text-[#2d2d2d] transition-colors"
                aria-label="Insert emoji"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                  <line x1="9" y1="9" x2="9.01" y2="9"/>
                  <line x1="15" y1="9" x2="15.01" y2="9"/>
                </svg>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadProgress !== null}
                className="absolute bottom-2 right-2 text-[#2d2d2d]/40 hover:text-[#2d2d2d] transition-colors disabled:opacity-30"
                aria-label="Attach file"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                </svg>
              </button>
              {emojiOpen && (
                <div className="absolute right-0 bottom-10 z-10">
                  <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setEmojiOpen(false)} />
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
            {uploadProgress !== null && (
              <div className="flex flex-col gap-1">
                <div className="h-0.5 w-full bg-[#2d2d2d]/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#2d2d2d] transition-all duration-150"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <span className="text-xs text-[#2d2d2d]/50 font-[family-name:var(--font-inter)]">
                  Uploading… {uploadProgress}%
                </span>
              </div>
            )}
            {uploadError && (
              <span className="text-red-500 text-xs font-[family-name:var(--font-inter)]">{uploadError}</span>
            )}
            {error && (
              <span className="text-red-500 text-xs font-[family-name:var(--font-inter)]">{error}</span>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setOpen(false); setError(null); setUploadError(null); setUploadProgress(null); }}
                className="text-sm px-4 py-2 font-[family-name:var(--font-inter)] text-[#2d2d2d]/60 hover:text-[#2d2d2d] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={sending || !text.trim() || uploadProgress !== null}
                className="bg-black text-white text-sm px-4 py-2 rounded font-[family-name:var(--font-inter)] hover:bg-[#2d2d2d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? "Sending…" : "Whisper"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
