"use client";

import { useState, useEffect, useRef } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { friendlyDate } from "@/lib/format";

interface ChannelItem {
  id: string;
  name: string;
  type: "GENERAL" | "PROJECT" | "DIRECT";
  subtitle?: string;
  avatarName?: string;
}

interface MessageItem {
  id: string;
  senderId: string;
  senderName: string;
  senderTitle?: string;
  content: string;
  createdAt: string;
  channelId: string;
}

interface ChatWorkbenchProps {
  currentUserId: string;
  currentUserName: string;
  channels: ChannelItem[];
}

export function ChatWorkbench({
  currentUserId,
  currentUserName,
  channels,
}: ChatWorkbenchProps) {
  const [activeChannel, setActiveChannel] = useState<ChannelItem>(channels[0] || {
    id: "general",
    name: "All Team Chat",
    type: "GENERAL",
  });

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load messages whenever active channel changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch(`/api/messages?channelType=${activeChannel.type}&channelId=${activeChannel.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data.data)) {
          setMessages(data.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeChannel.id, activeChannel.type]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = inputText.trim();
    if (!content || sending) return;

    // Optimistic UI message
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: MessageItem = {
      id: tempId,
      senderId: currentUserId,
      senderName: currentUserName,
      content,
      createdAt: new Date().toISOString(),
      channelId: activeChannel.id,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInputText("");
    setSending(true);

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelType: activeChannel.type,
          channelId: activeChannel.id,
          content,
        }),
      });

      if (res.ok) {
        const body = await res.json();
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? body.data : m))
        );
      }
    } catch (err) {
      console.error("Message send failed:", err);
    } finally {
      setSending(false);
    }
  };

  const generalChannels = channels.filter((c) => c.type === "GENERAL");
  const directChannels = channels.filter((c) => c.type === "DIRECT");

  return (
    <div className="rounded-card border border-border bg-surface shadow-soft overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[620px] max-h-[750px]">
      {/* Left Sidebar: Channels & Staff List */}
      <div className="md:col-span-4 border-r border-border bg-background/50 flex flex-col h-full max-h-[750px] overflow-hidden">
        <div className="p-4 border-b border-border bg-surface">
          <h3 className="text-sm font-bold text-text">Staff Direct Messages</h3>
          <p className="text-[11px] text-muted">1-on-1 team chats & company discussion</p>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-4">
          {/* General Broadcast */}
          <div className="space-y-1">
            <p className="px-2.5 text-[10px] font-bold text-subtle uppercase tracking-wider">
              General
            </p>
            {generalChannels.map((c) => {
              const isActive = activeChannel.id === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveChannel(c)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-button text-xs font-semibold transition-colors text-left min-h-[44px] ${
                    isActive
                      ? "bg-primary text-white shadow-xs"
                      : "text-muted hover:bg-neutral hover:text-text"
                  }`}
                >
                  <span className="text-base">📢</span>
                  <span className="truncate">{c.name}</span>
                </button>
              );
            })}
          </div>

          {/* Direct Staff Messages */}
          {directChannels.length > 0 && (
            <div className="space-y-1">
              <p className="px-2.5 text-[10px] font-bold text-subtle uppercase tracking-wider">
                Staff Members
              </p>
              {directChannels.map((c) => {
                const isActive = activeChannel.id === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveChannel(c)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-button text-xs font-semibold transition-colors text-left min-h-[44px] ${
                      isActive
                        ? "bg-primary text-white shadow-xs"
                        : "text-muted hover:bg-neutral hover:text-text"
                    }`}
                  >
                    <Avatar name={c.avatarName || c.name} size={28} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{c.name}</p>
                      {c.subtitle && (
                        <p
                          className={`text-[10px] truncate ${
                            isActive ? "text-white/80" : "text-subtle"
                          }`}
                        >
                          {c.subtitle}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Pane: Active Chat Window */}
      <div className="md:col-span-8 flex flex-col h-full max-h-[750px] bg-surface">
        {/* Chat Header */}
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between gap-3 bg-surface">
          <div className="flex items-center gap-3 min-w-0">
            {activeChannel.type === "DIRECT" ? (
              <Avatar name={activeChannel.avatarName || activeChannel.name} size={36} />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-button bg-primary-soft text-primary font-bold text-sm">
                📢
              </div>
            )}
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-text truncate">{activeChannel.name}</h4>
              <p className="text-[11px] text-muted truncate">
                {activeChannel.subtitle ||
                  (activeChannel.type === "GENERAL"
                    ? "Broadcast to all team members"
                    : "Staff direct conversation")}
              </p>
            </div>
          </div>
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-background/20">
          {loading ? (
            <div className="flex items-center justify-center h-full text-xs text-muted">
              Loading conversation...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-2">
              <span className="text-3xl">💬</span>
              <p className="text-sm font-bold text-text">No messages yet</p>
              <p className="text-xs text-muted max-w-xs">
                Start the conversation with {activeChannel.name}. Send updates, ask questions, or discuss tasks.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderId === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 max-w-[85%] ${
                    isMe ? "ml-auto flex-row-reverse" : "mr-auto"
                  }`}
                >
                  {!isMe && <Avatar name={msg.senderName} size={30} />}
                  <div className="space-y-0.5">
                    {!isMe && (
                      <p className="text-[10px] text-muted font-bold px-1">
                        {msg.senderName} {msg.senderTitle ? `• ${msg.senderTitle}` : ""}
                      </p>
                    )}
                    <div
                      className={`p-3 rounded-card text-xs leading-relaxed shadow-xs ${
                        isMe
                          ? "bg-primary text-white rounded-tr-none"
                          : "bg-surface border border-border text-text rounded-tl-none"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      <p
                        className={`text-[9px] mt-1 text-right font-mono ${
                          isMe ? "text-white/70" : "text-subtle"
                        }`}
                      >
                        {friendlyDate(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input Bar */}
        <form
          onSubmit={handleSendMessage}
          className="p-3 border-t border-border bg-surface flex items-center gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Message ${activeChannel.name}...`}
            className="flex-1 rounded-input border border-border bg-background px-4 py-2.5 text-base sm:text-xs text-text placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-h-[44px]"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || sending}
            className="rounded-button bg-primary hover:bg-primary-hover text-white text-xs font-bold px-5 py-2.5 min-h-[44px] shadow-sm transition-all active:scale-[0.98] disabled:opacity-40 shrink-0"
          >
            {sending ? "..." : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
