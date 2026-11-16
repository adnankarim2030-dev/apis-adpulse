"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { friendlyDate } from "@/lib/format";
import { WhatsAppVoiceCallModal, type ActiveCallState } from "@/components/chat/WhatsAppVoiceCallModal";

interface IncomingMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderTitle: string;
  content: string;
  channelType: "DIRECT" | "GENERAL";
  channelId: string;
  createdAt: string;
}

interface MessageThreadItem {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
}

interface GlobalChatPopupProps {
  currentUserId?: string;
  currentUserName?: string;
  activePath?: string;
}

function playChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.setValueAtTime(880, now + 0.1); // A5

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  } catch {
    // AudioContext might be blocked until user gesture, ignore
  }
}

export function GlobalChatPopup({
  currentUserId,
  currentUserName,
  activePath,
}: GlobalChatPopupProps) {
  const [activePopup, setActivePopup] = useState<IncomingMessage | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatWindowOpen, setChatWindowOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [chatTarget, setChatTarget] = useState<{ id: string; name: string; title: string; type: "DIRECT" | "GENERAL" } | null>(null);
  const [activeVoiceCall, setActiveVoiceCall] = useState<ActiveCallState | null>(null);

  const [threadMessages, setThreadMessages] = useState<MessageThreadItem[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [popupUploading, setPopupUploading] = useState(false);
  const [selectedPopupMedia, setSelectedPopupMedia] = useState<string | null>(null);
  const popupFileInputRef = useRef<HTMLInputElement>(null);

  const lastCheckedRef = useRef<string>(new Date(Date.now() - 5000).toISOString());
  const seenIdsRef = useRef<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Request browser Notification permission on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, []);

  // Show Native OS Desktop / Mobile Notification (works even when window is minimized)
  const showNativeNotification = useCallback((msg: IncomingMessage) => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "granted") {
      const isVoice = msg.content.startsWith("data:audio");
      const preview = isVoice ? "🎙️ Sent a voice note" : msg.content.slice(0, 90);

      try {
        const notif = new Notification(`${msg.senderName} (${msg.channelType === "DIRECT" ? "Direct Message" : "Team Chat"})`, {
          body: preview,
          icon: "/adpulse-logo.png",
          badge: "/adpulse-logo.png",
          tag: `apis-msg-${msg.id}`,
        });

        notif.onclick = () => {
          window.focus();
          setActivePopup(null);
          setChatTarget({
            id: msg.channelId,
            name: msg.senderName,
            title: msg.senderTitle,
            type: msg.channelType,
          });
          setChatWindowOpen(true);
          setUnreadCount(0);
          notif.close();
        };
      } catch {}
    }
  }, []);

  // Poll for incoming messages every 1.5 seconds
  const pollMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/messages/poll?since=${encodeURIComponent(lastCheckedRef.current)}`);
      if (!res.ok) return;
      const body = await res.json();
      const messages: IncomingMessage[] = body.data || [];
      if (body.serverTime) {
        lastCheckedRef.current = body.serverTime;
      }

      if (messages.length > 0) {
        const brandNew = messages.filter((m) => !seenIdsRef.current.has(m.id));
        if (brandNew.length > 0) {
          brandNew.forEach((m) => seenIdsRef.current.add(m.id));
          const latest = brandNew[0];
          if (!latest) return;

          // If user is not already on full /messages page
          if (activePath !== "/messages") {
            setActivePopup(latest);
            setUnreadCount((prev) => prev + brandNew.length);
            playChime();
          }

          // Trigger Native OS Notification (appears on Windows desktop / mobile notification shade when minimized)
          showNativeNotification(latest);

          // If chat window is open with this contact, append directly
          if (chatWindowOpen && chatTarget && chatTarget.id === latest.channelId) {
            setThreadMessages((prev) => [
              ...prev,
              {
                id: latest.id,
                senderId: latest.senderId,
                senderName: latest.senderName,
                content: latest.content,
                createdAt: latest.createdAt,
              },
            ]);
          }
        }
      }
    } catch {
      // silent background polling
    }

    // Check for incoming voice call signals
    if (currentUserId && !activeVoiceCall) {
      try {
        const callRes = await fetch("/api/calls/signal?poll=incoming");
        if (callRes.ok) {
          const callData = await callRes.json();
          if (callData.activeCall) {
            setActiveVoiceCall({
              callId: callData.activeCall.callId,
              isCaller: false,
              partnerId: callData.activeCall.callerId,
              partnerName: callData.activeCall.callerName,
              sdpOffer: callData.activeCall.sdpOffer,
            });
          }
        }
      } catch {}
    }
  }, [activePath, activeVoiceCall, chatTarget, chatWindowOpen, currentUserId, showNativeNotification]);

  useEffect(() => {
    const timer = setInterval(pollMessages, 1500);
    return () => clearInterval(timer);
  }, [pollMessages]);

  // Auto-dismiss popup after 9 seconds
  useEffect(() => {
    if (!activePopup) return;
    const t = setTimeout(() => {
      setActivePopup(null);
    }, 9000);
    return () => clearTimeout(t);
  }, [activePopup]);

  // Load thread when chat target changes
  useEffect(() => {
    if (!chatWindowOpen || !chatTarget) return;
    let cancelled = false;
    setLoadingThread(true);

    fetch(`/api/messages?channelType=${chatTarget.type}&channelId=${chatTarget.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data.data)) {
          setThreadMessages(data.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingThread(false);
      });

    return () => {
      cancelled = true;
    };
  }, [chatTarget, chatWindowOpen]);

  // Scroll to bottom on thread updates
  useEffect(() => {
    if (chatWindowOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [threadMessages, chatWindowOpen]);

  // Open Chat Window from notification popup
  const handleOpenFromNotification = (msg: IncomingMessage) => {
    setActivePopup(null);
    setChatTarget({
      id: msg.channelId,
      name: msg.senderName,
      title: msg.senderTitle,
      type: msg.channelType,
    });
    setChatWindowOpen(true);
    setUnreadCount(0);
  };

  // Send message inside mini popup chat
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || sending || !chatTarget) return;

    const tempId = `temp-${Date.now()}`;
    const optimistic: MessageThreadItem = {
      id: tempId,
      senderId: currentUserId || "me",
      senderName: currentUserName || "Me",
      content: text,
      createdAt: new Date().toISOString(),
    };

    setThreadMessages((prev) => [...prev, optimistic]);
    setInputText("");
    setSending(true);

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelType: chatTarget.type,
          channelId: chatTarget.id,
          content: text,
        }),
      });
      if (res.ok) {
        const body = await res.json();
        setThreadMessages((prev) =>
          prev.map((m) => (m.id === tempId ? body.data : m))
        );
      }
    } catch {
      // Keep optimistic
    } finally {
      setSending(false);
    }
  };

  // Handle Image/Video attachment in floating quick drawer
  const handlePopupMediaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !chatTarget) return;
    e.target.value = "";

    const isImg = file.type.startsWith("image/");
    const isVid = file.type.startsWith("video/");

    if (!isImg && !isVid) {
      alert("Please select a valid image or video.");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      alert("Direct in-chat attachments must be under 25 MB.");
      return;
    }

    setPopupUploading(true);
    try {
      if (isImg && file.size > 1.2 * 1024 * 1024) {
        const img = document.createElement("img");
        const objUrl = URL.createObjectURL(file);
        img.src = objUrl;

        await new Promise((resolve) => {
          img.onload = resolve;
        });

        const canvas = document.createElement("canvas");
        const maxDim = 1400;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        const compressed = canvas.toDataURL("image/jpeg", 0.82);
        URL.revokeObjectURL(objUrl);
        await sendPopupMedia(compressed);
      } else {
        const reader = new FileReader();
        reader.onloadend = async () => {
          await sendPopupMedia(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    } catch {
      alert("Failed to process media file.");
    } finally {
      setPopupUploading(false);
    }
  };

  const sendPopupMedia = async (base64Media: string) => {
    if (!chatTarget) return;
    const tempId = `temp-${Date.now()}`;
    const optimistic: MessageThreadItem = {
      id: tempId,
      senderId: currentUserId || "me",
      senderName: currentUserName || "Me",
      content: base64Media,
      createdAt: new Date().toISOString(),
    };

    setThreadMessages((prev) => [...prev, optimistic]);

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelType: chatTarget.type,
          channelId: chatTarget.id,
          content: base64Media,
        }),
      });
      if (res.ok) {
        const body = await res.json();
        setThreadMessages((prev) =>
          prev.map((m) => (m.id === tempId ? body.data : m))
        );
      }
    } catch {}
  };

  return (
    <>
      {/* 1. CENTER NOTIFICATION POPUP (Centered on Desktop & Mobile Screen) */}
      {activePopup && (
        <div className="fixed top-4 md:top-6 left-1/2 -translate-x-1/2 z-50 w-[94vw] max-w-md animate-in slide-in-from-top-4 fade-in duration-300 drop-shadow-2xl">
          <div className="rounded-2xl border-2 border-teal-500/40 bg-white/98 backdrop-blur-md p-4 shadow-2xl flex items-start gap-3.5 ring-2 ring-teal-500/10">
            <div className="relative shrink-0">
              <Avatar name={activePopup.senderName} size={42} />
              <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white ring-1 ring-emerald-400" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <p className="text-sm font-extrabold text-slate-900 truncate">
                  {activePopup.senderName}
                </p>
                <span className="text-[10px] font-semibold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                  {activePopup.channelType === "DIRECT" ? "Direct Chat" : "Team Chat"}
                </span>
              </div>

              <p className="text-xs text-slate-500 font-medium mb-1.5 truncate">
                {activePopup.senderTitle}
              </p>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 mb-2.5">
                <p className="text-xs text-slate-800 line-clamp-2 font-medium leading-relaxed">
                  &ldquo;{activePopup.content}&rdquo;
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenFromNotification(activePopup)}
                  className="flex-1 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-bold py-1.5 px-3 shadow-sm transition-all text-center flex items-center justify-center gap-1.5"
                >
                  <span>💬</span>
                  <span>Quick Reply</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActivePopup(null)}
                  className="rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-xs font-semibold py-1.5 px-3 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActivePopup(null)}
              className="text-slate-400 hover:text-slate-700 text-sm p-1 leading-none -mt-1 -mr-1"
              title="Close notification"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 2. EXPANDABLE FLOATING CHAT WINDOW (Default Large or Full Screen) */}
      {chatWindowOpen && chatTarget && (
        <div
          className={`fixed z-50 rounded-2xl bg-white shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden transition-all duration-200 animate-in fade-in ${
            isFullScreen
              ? "inset-2 sm:inset-5 md:inset-8 w-auto h-auto max-h-none"
              : "bottom-4 right-4 sm:right-6 w-[95vw] sm:w-[480px] md:w-[540px] h-[640px] max-h-[88vh]"
          }`}
        >
          {/* Header */}
          <div className="p-3.5 bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white flex items-center justify-between shrink-0 shadow-md">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar name={chatTarget.name} size={34} />
              <div className="min-w-0">
                <p className="text-sm font-extrabold truncate leading-tight text-white">{chatTarget.name}</p>
                <p className="text-[10px] text-teal-400 font-medium truncate">{chatTarget.title}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {chatTarget.type === "DIRECT" && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveVoiceCall({
                      callId: `call-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                      isCaller: true,
                      partnerId: chatTarget.id,
                      partnerName: chatTarget.name,
                      partnerTitle: chatTarget.title,
                    });
                  }}
                  className="text-xs font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 px-2 py-1 rounded-md transition-colors flex items-center gap-1"
                  title="Start Voice Call"
                >
                  <span>📞</span>
                  <span className="hidden sm:inline">Call</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsFullScreen(!isFullScreen)}
                className="text-[11px] font-bold bg-white/10 hover:bg-white/20 text-slate-200 px-2 py-1 rounded-md transition-colors"
                title={isFullScreen ? "Restore smaller size" : "Expand to Full Size"}
              >
                {isFullScreen ? "🗗 Restore" : "⛶ Full Size"}
              </button>
              <Link
                href="/messages"
                className="text-[11px] font-semibold bg-white/10 hover:bg-white/20 text-slate-200 px-2 py-1 rounded-md transition-colors"
                title="Open full page chat"
              >
                Full Page ↗
              </Link>
              <button
                type="button"
                onClick={() => {
                  setChatWindowOpen(false);
                  setIsFullScreen(false);
                }}
                className="text-slate-300 hover:text-white text-base p-1 leading-none rounded-md hover:bg-white/10 transition-colors"
                title="Minimize chat window"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Conversation Thread */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 bg-slate-50/70">
            {loadingThread ? (
              <div className="flex items-center justify-center h-full text-xs text-slate-400 font-medium">
                Loading messages…
              </div>
            ) : threadMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4 space-y-1.5">
                <span className="text-2xl">💬</span>
                <p className="text-xs font-bold text-slate-700">No conversation yet</p>
                <p className="text-[11px] text-slate-400">Send a quick message to start chatting!</p>
              </div>
            ) : (
              threadMessages.map((msg) => {
                const isMe = msg.senderId === currentUserId || msg.senderName === currentUserName;
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs shadow-xs ${
                        isMe
                          ? "bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-br-xs"
                          : "bg-white text-slate-900 border border-slate-200/90 rounded-bl-xs"
                      }`}
                    >
                      {!isMe && (
                        <p className="text-[10px] font-extrabold text-teal-700 mb-0.5">
                          {msg.senderName}
                        </p>
                      )}
                      {msg.content.startsWith("data:audio") ? (
                        <div className="flex flex-col gap-1 py-0.5">
                          <span className="text-[10px] font-bold opacity-80 flex items-center gap-1">
                            <span>🎙️</span>
                            <span>Voice Note</span>
                          </span>
                          <audio controls src={msg.content} className="max-w-[200px] h-7" />
                        </div>
                      ) : msg.content.startsWith("data:image") ? (
                        <div className="py-0.5 space-y-1">
                          <img
                            src={msg.content}
                            alt="Shared"
                            onClick={() => setSelectedPopupMedia(msg.content)}
                            className="max-w-[200px] sm:max-w-[260px] max-h-[220px] object-cover rounded-xl shadow-xs cursor-pointer hover:opacity-90"
                          />
                          <p className="text-[9px] opacity-75 font-semibold">📷 Image</p>
                        </div>
                      ) : msg.content.startsWith("data:video") ? (
                        <div className="py-0.5 space-y-1">
                          <video
                            controls
                            src={msg.content}
                            className="max-w-[200px] sm:max-w-[260px] max-h-[180px] rounded-xl shadow-xs"
                          />
                          <p className="text-[9px] opacity-75 font-semibold">🎥 Video</p>
                        </div>
                      ) : (
                        <p className="break-words leading-relaxed">{msg.content}</p>
                      )}
                    </div>
                    <span className="text-[9px] text-slate-400 mt-0.5 px-1 font-medium">
                      {friendlyDate(msg.createdAt)}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form with Attachment Button */}
          <form onSubmit={handleSendMessage} className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-1.5 shrink-0">
            {/* Hidden file input */}
            <input
              type="file"
              ref={popupFileInputRef}
              accept="image/*,video/*"
              className="hidden"
              onChange={handlePopupMediaSelect}
            />

            <button
              type="button"
              onClick={() => popupFileInputRef.current?.click()}
              disabled={popupUploading}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm flex items-center justify-center transition-colors border border-slate-200"
              title="Attach Image or Video (up to 25 MB)"
            >
              {popupUploading ? <span className="animate-spin text-xs">⏳</span> : "📎"}
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Message ${chatTarget.name}…`}
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            <button
              type="submit"
              disabled={sending || !inputText.trim() || popupUploading}
              className="rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white px-3.5 py-2 text-xs font-bold transition-all disabled:opacity-40 shadow-xs shrink-0 flex items-center justify-center"
            >
              {sending ? "…" : "Send"}
            </button>
          </form>
        </div>
      )}

      {/* Lightbox for Popups */}
      {selectedPopupMedia && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setSelectedPopupMedia(null)}
        >
          <div
            className="relative max-w-3xl max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex justify-end pb-2">
              <button
                type="button"
                onClick={() => setSelectedPopupMedia(null)}
                className="text-white bg-white/20 hover:bg-white/30 rounded-lg px-2.5 py-1 text-sm font-bold"
              >
                ✕ Close
              </button>
            </div>
            <img
              src={selectedPopupMedia}
              alt="Enlarged"
              className="max-h-[80vh] max-w-full rounded-xl shadow-2xl object-contain border border-white/10"
            />
          </div>
        </div>
      )}

      {/* 3. FLOATING CHAT BUBBLE BUTTON (Bottom-right on every page) */}
      {!chatWindowOpen && activePath !== "/messages" && (
        <button
          type="button"
          onClick={() => {
            setChatTarget({
              id: "general",
              name: "All Team Chat 📢",
              title: "AdPulse Company Channel",
              type: "GENERAL",
            });
            setChatWindowOpen(true);
            setUnreadCount(0);
          }}
          className="fixed bottom-20 md:bottom-6 right-5 z-40 h-13 w-13 rounded-full bg-gradient-to-br from-teal-500 via-teal-600 to-emerald-600 text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center border-2 border-white/80 group"
          title="Open Quick Chat"
        >
          <span className="text-xl group-hover:rotate-6 transition-transform">💬</span>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center border-2 border-white animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* 4. GLOBAL IN-APP WEBRTC VOICE CALL MODAL (Incoming or Outgoing) */}
      {activeVoiceCall && (
        <WhatsAppVoiceCallModal
          currentUserId={currentUserId || ""}
          currentUserName={currentUserName || "User"}
          callState={activeVoiceCall}
          onEndCall={() => setActiveVoiceCall(null)}
        />
      )}
    </>
  );
}
