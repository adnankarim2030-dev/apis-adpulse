"use client";

import { useState, useRef, useEffect, useMemo } from "react";

interface EmojiItem {
  emoji: string;
  name: string;
  category: "work" | "smileys" | "gestures" | "office" | "animated";
  animated?: boolean;
}

const EMOJI_CATALOG: EmojiItem[] = [
  // --- Quick Professional & Animated Favorites ---
  { emoji: "👍", name: "thumbs up approve", category: "work", animated: true },
  { emoji: "👏", name: "clap bravo well done", category: "work", animated: true },
  { emoji: "🚀", name: "rocket launch fast progress", category: "work", animated: true },
  { emoji: "🔥", name: "fire hot trending awesome", category: "work", animated: true },
  { emoji: "🎯", name: "target goal bullseye precision", category: "work", animated: true },
  { emoji: "🎉", name: "celebration party success", category: "work", animated: true },
  { emoji: "✅", name: "check verified completed done", category: "work", animated: true },
  { emoji: "🤝", name: "handshake deal partnership agree", category: "work", animated: true },
  { emoji: "💡", name: "lightbulb idea innovation insight", category: "work", animated: true },
  { emoji: "💯", name: "hundred perfect score 100", category: "work", animated: true },
  { emoji: "⭐", name: "star favorite top quality", category: "work", animated: true },
  { emoji: "🏆", name: "trophy winner victory first", category: "work", animated: true },
  { emoji: "☕", name: "coffee break work energy", category: "work", animated: true },
  { emoji: "🧠", name: "brain intellect strategy smart", category: "work", animated: true },
  { emoji: "📌", name: "pin urgent reminder important", category: "work", animated: true },
  { emoji: "⏰", name: "clock deadline urgent time", category: "work", animated: true },

  // --- Smileys & Expressions ---
  { emoji: "😊", name: "smile happy warm polite", category: "smileys" },
  { emoji: "😀", name: "grinning joyful cheer", category: "smileys" },
  { emoji: "😄", name: "laugh happy eyes", category: "smileys" },
  { emoji: "😁", name: "beam proud grin", category: "smileys" },
  { emoji: "😎", name: "cool confident glasses", category: "smileys" },
  { emoji: "😇", name: "angel innocent kind", category: "smileys" },
  { emoji: "🙂", name: "slight smile positive", category: "smileys" },
  { emoji: "😉", name: "wink nod agree", category: "smileys" },
  { emoji: "🤩", name: "star eyes amazed impressed", category: "smileys" },
  { emoji: "🥳", name: "party celebration congrats", category: "smileys" },
  { emoji: "🤔", name: "thinking analyze ponder consider", category: "smileys" },
  { emoji: "🫡", name: "salute respect acknowledged yes sir", category: "smileys" },
  { emoji: "😂", name: "joy laugh tears funny", category: "smileys" },
  { emoji: "😅", name: "sweat smile relief nervous", category: "smileys" },
  { emoji: "😌", name: "relieved peaceful satisfied", category: "smileys" },
  { emoji: "🙌", name: "raised hands praise celebrate", category: "smileys" },

  // --- Hand Gestures & Approvals ---
  { emoji: "👍", name: "thumbs up approve yes", category: "gestures" },
  { emoji: "👌", name: "ok perfect agreed fine", category: "gestures" },
  { emoji: "✌️", name: "victory peace two", category: "gestures" },
  { emoji: "🤞", name: "crossed fingers luck hope", category: "gestures" },
  { emoji: "💪", name: "muscle strong effort power", category: "gestures" },
  { emoji: "🙏", name: "thank you please respect namaste", category: "gestures" },
  { emoji: "👊", name: "fist bump team solidarity", category: "gestures" },
  { emoji: "👋", name: "wave hello goodbye hi", category: "gestures" },
  { emoji: "✍️", name: "writing note taking signature", category: "gestures" },
  { emoji: "👀", name: "eyes looking reviewing attention", category: "gestures" },
  { emoji: "🤌", name: "pinched fingers exact chef kiss", category: "gestures" },
  { emoji: "✨", name: "sparkles excellence magic clean", category: "gestures" },

  // --- Office, Analytics & Projects ---
  { emoji: "💼", name: "briefcase business executive office", category: "office" },
  { emoji: "📊", name: "bar chart report analytics metrics", category: "office" },
  { emoji: "📈", name: "chart increasing growth sales profit", category: "office" },
  { emoji: "💻", name: "laptop computer tech dev work", category: "office" },
  { emoji: "📱", name: "mobile phone app call screen", category: "office" },
  { emoji: "✉️", name: "envelope email message contact", category: "office" },
  { emoji: "📅", name: "calendar schedule meeting date", category: "office" },
  { emoji: "📝", name: "memo notepad task list document", category: "office" },
  { emoji: "📁", name: "folder files directory archive", category: "office" },
  { emoji: "📋", name: "clipboard checklist audit task", category: "office" },
  { emoji: "🔍", name: "search inspect research review", category: "office" },
  { emoji: "📢", name: "announcement broadcast megaphone alert", category: "office" },
  { emoji: "🛠️", name: "tools settings config development", category: "office" },
  { emoji: "💰", name: "money finance budget payment invoice", category: "office" },
  { emoji: "🏢", name: "office building company headquarters", category: "office" },
  { emoji: "🌐", name: "global web internet worldwide client", category: "office" },
];

const CATEGORIES = [
  { id: "all", label: "All", icon: "✨" },
  { id: "work", label: "Work & Reactions", icon: "⚡" },
  { id: "smileys", label: "Smileys", icon: "😊" },
  { id: "gestures", label: "Gestures", icon: "👍" },
  { id: "office", label: "Office & Tech", icon: "💼" },
] as const;

interface EmojiPickerPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
  onSendInstantReaction?: (emoji: string) => void;
}

export function EmojiPickerPopover({
  isOpen,
  onClose,
  onSelectEmoji,
  onSendInstantReaction,
}: EmojiPickerPopoverProps) {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on Escape or Outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    // Auto focus search
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Filter emojis based on active category and search query
  const filteredEmojis = useMemo(() => {
    let list = EMOJI_CATALOG;
    if (activeCategory !== "all") {
      list = list.filter((item) => item.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((item) => item.name.includes(q) || item.emoji.includes(q));
    }
    return list;
  }, [activeCategory, searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      className="absolute bottom-full mb-2 left-0 sm:left-2 z-50 w-[310px] sm:w-[360px] max-w-[95vw] bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150 backdrop-blur-md"
    >
      {/* Header with Title & Quick Animated Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-base animate-bounce">⚡</span>
            <span className="text-xs font-black tracking-wide uppercase text-teal-300">
              Professional Emojis
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 1-Click Animated Quick Reactions Bar */}
        <div className="flex items-center justify-between gap-1 bg-white/10 p-1.5 rounded-xl border border-white/10">
          {["👍", "👏", "🚀", "🔥", "🎯", "🎉", "✅", "💡"].map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                if (onSendInstantReaction) {
                  onSendInstantReaction(emoji);
                } else {
                  onSelectEmoji(emoji);
                }
              }}
              title={`Quick React: ${emoji}`}
              className="text-lg hover:scale-135 hover:-translate-y-1 transition-all duration-200 active:scale-95 p-1 rounded-lg hover:bg-white/20 select-none"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="p-2 border-b border-slate-100 bg-slate-50/70">
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">
            🔍
          </span>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search emoji (e.g. rocket, done, clap)..."
            className="w-full pl-7 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 text-slate-800 placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1 mt-2 overflow-x-auto pb-0.5 no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setActiveCategory(cat.id);
                setSearchQuery("");
              }}
              className={`text-[11px] font-bold px-2.5 py-1 rounded-lg whitespace-nowrap transition-all flex items-center gap-1 shrink-0 ${
                activeCategory === cat.id
                  ? "bg-teal-700 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100"
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Emoji Grid Area */}
      <div className="p-2.5 max-h-[220px] overflow-y-auto grid grid-cols-7 gap-1.5 bg-white">
        {filteredEmojis.length === 0 ? (
          <div className="col-span-7 py-8 text-center text-slate-400">
            <p className="text-2xl mb-1">🧐</p>
            <p className="text-xs font-semibold">No emojis found</p>
            <p className="text-[10px] text-slate-400">Try searching for &quot;check&quot; or &quot;rocket&quot;</p>
          </div>
        ) : (
          filteredEmojis.map((item, idx) => (
            <button
              key={`${item.emoji}-${idx}`}
              type="button"
              onClick={() => onSelectEmoji(item.emoji)}
              title={item.name}
              className="h-10 w-10 flex items-center justify-center text-xl rounded-xl hover:bg-teal-50 hover:scale-125 hover:shadow-sm active:scale-90 transition-all duration-150 select-none cursor-pointer group"
            >
              <span className="transition-transform group-hover:scale-110">
                {item.emoji}
              </span>
            </button>
          ))
        )}
      </div>

      {/* Footer Helper */}
      <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
        <span className="flex items-center gap-1 font-medium">
          <span className="text-teal-600 font-bold">Tip:</span> Click emoji to insert in message
        </span>
        <span className="text-slate-400 font-mono text-[9px]">APIS Live Chat</span>
      </div>
    </div>
  );
}
