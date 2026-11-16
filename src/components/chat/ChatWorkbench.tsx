"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  const [activeChannel, setActiveChannel] = useState<ChannelItem>(
    channels[0] || {
      id: "general",
      name: "All Team Chat 📢",
      type: "GENERAL",
    }
  );

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);

  // Voice Note Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Audio/Video Calling State
  const [activeCall, setActiveCall] = useState<{ mode: "audio" | "video"; roomUrl: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fast 1.5s Polling for live messages
  const fetchMessages = useCallback(
    async (showLoading = false) => {
      if (showLoading) setLoading(true);
      try {
        const res = await fetch(
          `/api/messages?channelType=${activeChannel.type}&channelId=${activeChannel.id}`
        );
        const data = await res.json();
        if (Array.isArray(data.data)) {
          setMessages((prev) => {
            if (
              prev.length !== data.data.length ||
              prev[prev.length - 1]?.id !== data.data[data.data.length - 1]?.id
            ) {
              return data.data;
            }
            return prev;
          });
        }
      } catch {
        // silent sync
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [activeChannel.id, activeChannel.type]
  );

  useEffect(() => {
    fetchMessages(true);
    const interval = setInterval(() => {
      fetchMessages(false);
    }, 1500); // 1.5 seconds ultra-fast real-time poll
    return () => clearInterval(interval);
  }, [fetchMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send standard text message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = inputText.trim();
    if (!content || sending) return;

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
    } catch {
      // keep optimistic
    } finally {
      setSending(false);
    }
  };

  // Voice Recording Functions
  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        alert("Your browser does not support audio recording.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (audioBlob.size > 0) {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = () => {
            const base64 = reader.result as string;
            sendVoiceMessage(base64);
          };
        }
      };

      recorder.start();
      setIsRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch {
      alert("Microphone permission was denied or unavailable.");
    }
  };

  const stopRecording = (shouldSend: boolean) => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    if (!mediaRecorderRef.current) {
      setIsRecording(false);
      return;
    }
    if (!shouldSend) {
      audioChunksRef.current = [];
    }
    if (mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordSeconds(0);
  };

  const sendVoiceMessage = async (base64Audio: string) => {
    const tempId = `temp-voice-${Date.now()}`;
    const optimisticMsg: MessageItem = {
      id: tempId,
      senderId: currentUserId,
      senderName: currentUserName,
      content: base64Audio,
      createdAt: new Date().toISOString(),
      channelId: activeChannel.id,
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelType: activeChannel.type,
          channelId: activeChannel.id,
          content: base64Audio,
        }),
      });
      if (res.ok) {
        const body = await res.json();
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? body.data : m))
        );
      }
    } catch {
      // keep
    }
  };

  // Start Call (Audio or Video)
  const initiateCall = async (mode: "audio" | "video") => {
    const cleanRoomName = `APIS-${activeChannel.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 16)}`;
    const roomUrl = `https://meet.jit.si/${cleanRoomName}#config.startWithAudioMuted=${mode === "video" ? "false" : "false"}&config.startWithVideoMuted=${mode === "audio" ? "true" : "false"}`;
    setActiveCall({ mode, roomUrl });

    // Broadcast call link into the chat thread
    const callNotice = mode === "video"
      ? `🎥 Started a Video Call. Join Room: ${cleanRoomName}`
      : `📞 Started a Voice Call. Join Room: ${cleanRoomName}`;

    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelType: activeChannel.type,
          channelId: activeChannel.id,
          content: callNotice,
        }),
      });
      fetchMessages(false);
    } catch {}
  };

  const generalChannels = channels.filter((c) => c.type === "GENERAL");
  const directChannels = channels.filter((c) => c.type === "DIRECT");

  return (
    <div className="rounded-card border border-border bg-surface shadow-soft overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[640px] max-h-[780px] relative">
      {/* Call Modal Overlay (Video/Audio) */}
      {activeCall && (
        <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col p-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 text-white border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xl">{activeCall.mode === "video" ? "🎥" : "📞"}</span>
              <p className="font-extrabold text-sm sm:text-base">
                APIS Live {activeCall.mode === "video" ? "Video" : "Voice"} Meeting • {activeChannel.name}
              </p>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
                Connected
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveCall(null)}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3.5 py-1.5 transition-colors flex items-center gap-1.5 shadow-md"
            >
              <span>✕</span>
              <span>End Call</span>
            </button>
          </div>

          <div className="flex-1 mt-3 rounded-2xl overflow-hidden border border-slate-800 bg-black">
            <iframe
              src={activeCall.roomUrl}
              allow="camera; microphone; display-capture; autoplay; clipboard-write"
              className="w-full h-full border-0"
              title="APIS Video Call"
            />
          </div>
        </div>
      )}

      {/* Left Sidebar: Channels & Staff List */}
      <div className="md:col-span-4 border-r border-border bg-background/50 flex flex-col h-full max-h-[780px] overflow-hidden">
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
      <div className="md:col-span-8 flex flex-col h-full max-h-[780px] bg-surface">
        {/* Chat Header with Voice & Video Call Buttons */}
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

          {/* Action Buttons: 📞 Call & 🎥 Video Call */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => initiateCall("audio")}
              className="flex items-center gap-1 text-xs font-bold bg-teal-50 hover:bg-teal-100 text-teal-700 px-2.5 py-1.5 rounded-lg border border-teal-200 transition-colors shadow-xs"
              title="Start Voice Call"
            >
              <span>📞</span>
              <span className="hidden sm:inline">Voice Call</span>
            </button>
            <button
              type="button"
              onClick={() => initiateCall("video")}
              className="flex items-center gap-1 text-xs font-bold bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white px-2.5 py-1.5 rounded-lg shadow-xs transition-all"
              title="Start Video Call"
            >
              <span>🎥</span>
              <span className="hidden sm:inline">Video Call</span>
            </button>
          </div>
        </div>

        {/* Message Feed with Audio Voice Note Player */}
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
                Start the conversation with {activeChannel.name}. Send updates, voice notes, or discuss tasks.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderId === currentUserId;
              const isAudio = msg.content.startsWith("data:audio");
              const isCallInvite = msg.content.includes("Started a Video Call") || msg.content.includes("Started a Voice Call");

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
                      {isAudio ? (
                        <div className="flex flex-col gap-1 py-1">
                          <span className="text-[10px] font-bold opacity-80 flex items-center gap-1">
                            <span>🎙️</span>
                            <span>Voice Note</span>
                          </span>
                          <audio controls src={msg.content} className="max-w-[220px] sm:max-w-[260px] h-8" />
                        </div>
                      ) : isCallInvite ? (
                        <div className="space-y-1.5 py-1">
                          <p className="font-bold flex items-center gap-1.5">
                            <span>{msg.content.includes("Video") ? "🎥" : "📞"}</span>
                            <span>{msg.content}</span>
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              const match = msg.content.match(/Join Room: ([A-Za-z0-9-]+)/);
                              const room = match ? match[1] : `APIS-${activeChannel.id}`;
                              setActiveCall({
                                mode: msg.content.includes("Video") ? "video" : "audio",
                                roomUrl: `https://meet.jit.si/${room}`,
                              });
                            }}
                            className="text-xs font-bold bg-white text-teal-800 hover:bg-slate-100 px-3 py-1.5 rounded-lg shadow-xs transition-colors flex items-center gap-1"
                          >
                            <span>Join Meeting ↗</span>
                          </button>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      )}
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

        {/* Chat Input Bar with 🎙️ Mic Voice Recorder */}
        <div className="p-3 border-t border-border bg-surface">
          {isRecording ? (
            /* Live Voice Recording UI */
            <div className="flex items-center justify-between gap-3 p-2 bg-rose-50 border border-rose-200 rounded-xl animate-in fade-in duration-100">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-rose-600 animate-ping" />
                <span className="text-xs font-extrabold text-rose-700">Recording Voice Note...</span>
                <span className="text-xs font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                  {Math.floor(recordSeconds / 60)}:{String(recordSeconds % 60).padStart(2, "0")}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => stopRecording(false)}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200 transition-colors"
                >
                  ✕ Cancel
                </button>
                <button
                  type="button"
                  onClick={() => stopRecording(true)}
                  className="text-xs font-extrabold bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 text-white px-3.5 py-1.5 rounded-lg shadow-sm transition-all flex items-center gap-1"
                >
                  <span>Send Voice ➤</span>
                </button>
              </div>
            </div>
          ) : (
            /* Standard Input Bar with Mic Button */
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Message ${activeChannel.name}...`}
                className="flex-1 rounded-input border border-border bg-background px-4 py-2.5 text-base sm:text-xs text-text placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-h-[44px]"
              />

              {/* 🎙️ Voice Note Record Button */}
              <button
                type="button"
                onClick={startRecording}
                className="rounded-button bg-slate-100 hover:bg-slate-200 text-slate-700 text-base p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center transition-all border border-slate-200 shadow-xs"
                title="Hold or click to record Voice Note"
              >
                🎙️
              </button>

              {/* Send Button */}
              <button
                type="submit"
                disabled={!inputText.trim() || sending}
                className="rounded-button bg-primary hover:bg-primary-hover text-white text-xs font-bold px-5 py-2.5 min-h-[44px] shadow-sm transition-all active:scale-[0.98] disabled:opacity-40 shrink-0"
              >
                {sending ? "..." : "Send"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
