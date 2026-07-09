"use client";

import { useEffect, useRef } from "react";

const CATEGORIES: { label: string; emojis: string[] }[] = [
  {
    label: "Smileys",
    emojis: ["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","😉","😊","😇","🥰","😍","🤩","😘","😋","😛","😜","🤪","🤑","🤗","🤔","😐","😑","😶","😏","😒","🙄","😬","😌","😔","😢","😭","😤","😡","🤬","😈","💀","🤡","👻","😷","🤒","🥴","😵","🤯","😎","🤓"],
  },
  {
    label: "Gestures",
    emojis: ["👋","🤚","✋","🖖","🫶","👌","✌️","🤞","🤟","🤘","🤙","👆","👇","👈","👉","👍","👎","✊","👊","🤛","🤜","👏","🙌","🤝","🙏","💪","🤌","🫰","🤏"],
  },
  {
    label: "Hearts",
    emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟","♥️","💌"],
  },
  {
    label: "Animals",
    emojis: ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🙈","🙉","🙊","🐔","🐧","🐦","🦆","🦉","🦋","🐌","🐞","🐬","🐳","🦈","🦒","🐘","🦓","🐕","🐈","🦜","🐢","🦕","🐙"],
  },
  {
    label: "Food",
    emojis: ["🍎","🍊","🍋","🍌","🍉","🍇","🍓","🍒","🍑","🥭","🍍","🥥","🥑","🌽","🥕","🍔","🍟","🍕","🌮","🌯","🍣","🍜","🍝","🍦","🍰","🎂","🍩","🍪","🍫","🍬","🍭","🧁","☕","🍺","🥤","🍷"],
  },
  {
    label: "Activities",
    emojis: ["⚽","🏀","🏈","🎾","🏐","⚾","🥊","🏆","🥇","🎯","🎱","🎮","🎲","♟️","🎸","🎹","🎷","🎺","🎻","🥁","🎤","🎨","📸","🎭","🎬"],
  },
  {
    label: "Travel",
    emojis: ["🚗","🏎️","🚀","✈️","🚢","🚂","🚲","🛸","🚁","⛵","🏖️","🗻","🏕️","🌋","🌅","🌃","🌆","🗼","🏰","🗽"],
  },
  {
    label: "Objects",
    emojis: ["📱","💻","⌨️","📷","📹","📺","📻","🔋","💡","🔦","🧲","🔑","🔒","✂️","🔧","🔩","📚","📖","📝","✏️","📦","🎁","💊","🔭","🔬","⚗️"],
  },
  {
    label: "Symbols",
    emojis: ["⭐","🌟","✨","💫","🌈","☀️","⛅","🌧️","❄️","🌊","🔥","💥","🌀","🌙","⚡","✅","❌","⭕","❓","❗","💯","🔝","🔴","🟡","🟢","🔵","🟣","⚫","⚪"],
  },
];

interface Props {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiPicker({ onSelect, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="w-64 max-h-72 overflow-y-auto bg-surface border border-line-strong rounded-lg shadow-lg p-2"
      onWheel={(e) => e.stopPropagation()}
    >
      {CATEGORIES.map(({ label, emojis }) => (
        <div key={label} className="mb-2">
          <p className="text-[10px] uppercase tracking-widest text-ink-faint font-[family-name:var(--font-inter)] mb-1 px-1">
            {label}
          </p>
          <div className="flex flex-wrap">
            {emojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => { onSelect(emoji); onClose(); }}
                className="text-xl hover:opacity-90/10 rounded p-0.5 transition-colors leading-none"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
