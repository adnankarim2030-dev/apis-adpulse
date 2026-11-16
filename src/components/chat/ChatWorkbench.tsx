"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { friendlyDate } from "@/lib/format";
import { WhatsAppVoiceCallModal, type ActiveCallState } from "@/components/chat/WhatsAppVoiceCallModal";
import { CloudflareSetupModal } from "@/components/chat/CloudflareSetupModal";

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

  // WhatsApp Style Audio Calling State
  const [activeCall, setActiveCall] = useState<ActiveCallState | null>(null);

  // Images, Videos & Cloudflare R2 Attachment State
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showCloudModal, setShowCloudModal] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Format bytes helper for Cloud files
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Handle Image, Video & Heavy File (up to 10 GB) Selection
  const handleMediaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    // If file is > 3.5 MB (or heavy video/archive up to 10 GB):
    // Use Cloudflare R2 direct presigned upload to bypass Vercel 4.5 MB serverless limit
    if (file.size > 3.5 * 1024 * 1024) {
      setUploadingMedia(true);
      setUploadProgress(1);

      try {
        const presignRes = await fetch("/api/uploads/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            fileSize: file.size,
            contentType: file.type || "application/octet-stream",
          }),
        });

        const presignData = await presignRes.json();

        if (presignData.configured && presignData.uploadUrl) {
          // Direct Browser-to-Cloudflare R2 PUT upload
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", presignData.uploadUrl, true);
          xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

          xhr.upload.onprogress = (evt) => {
            if (evt.lengthComputable) {
              const pct = Math.round((evt.loaded / evt.total) * 100);
              setUploadProgress(pct);
            }
          };

          xhr.onload = async () => {
            setUploadingMedia(false);
            setUploadProgress(0);
            if (xhr.status >= 200 && xhr.status < 300) {
              const payload = `[FILE_ATTACHMENT]:${JSON.stringify({
                name: file.name,
                size: formatBytes(file.size),
                url: presignData.downloadUrl,
              })}`;
              await sendMediaMessage(payload);
            } else {
              alert("Direct upload to Cloudflare R2 failed. Please verify R2 bucket permissions.");
            }
          };

          xhr.onerror = () => {
            setUploadingMedia(false);
            setUploadProgress(0);
            alert("Network error during upload to Cloudflare R2.");
          };

          xhr.send(file);
          return;
        } else {
          // R2 API keys not yet saved in environment, open setup modal & link sharer
          setUploadingMedia(false);
          setUploadProgress(0);
          setShowCloudModal(true);
          return;
        }
      } catch {
        setUploadingMedia(false);
        setUploadProgress(0);
        setShowCloudModal(true);
        return;
      }
    }

    const isImg = file.type.startsWith("image/");
    const isVid = file.type.startsWith("video/");

    if (!isImg && !isVid) {
      alert("Please select an image, video, or use the ☁️ 10 GB button for large files.");
      return;
    }

    setUploadingMedia(true);

    try {
      if (isImg && file.size > 1.2 * 1024 * 1024) {
        // High-res image compression via canvas
        const img = document.createElement("img");
        const objUrl = URL.createObjectURL(file);
        img.src = objUrl;

        await new Promise((resolve) => {
          img.onload = resolve;
        });

        const canvas = document.createElement("canvas");
        const maxDim = 1600;
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

        const compressedData = canvas.toDataURL("image/jpeg", 0.84);
        URL.revokeObjectURL(objUrl);
        await sendMediaMessage(compressedData);
      } else {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const result = reader.result as string;
          await sendMediaMessage(result);
        };
        reader.readAsDataURL(file);
      }
    } catch {
      alert("Failed to process media file.");
    } finally {
      setUploadingMedia(false);
    }
  };

  const sendMediaMessage = async (base64Content: string) => {
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: MessageItem = {
      id: tempId,
      senderId: currentUserId,
      senderName: currentUserName,
      content: base64Content,
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
          content: base64Content,
        }),
      });
      if (res.ok) {
        const body = await res.json();
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? body.data : m))
        );
      }
    } catch {}
  };

  // Start WhatsApp Style In-App Voice Call
  const initiateCall = async (mode: "audio" | "video") => {
    const callId = `call-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setActiveCall({
      callId,
      isCaller: true,
      partnerId: activeChannel.id,
      partnerName: activeChannel.name,
      partnerTitle: activeChannel.subtitle,
    });

    // Broadcast call notice into the chat thread
    const callNotice = `📞 Started an End-to-End Encrypted Voice Call with ${activeChannel.name}`;

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
    <div className="rounded-2xl border border-slate-200/90 bg-surface shadow-md overflow-hidden grid grid-cols-1 md:grid-cols-12 h-[calc(100vh-170px)] min-h-[620px] relative">
      {/* WhatsApp Style Pure In-App WebRTC Voice Call Modal */}
      {activeCall && (
        <WhatsAppVoiceCallModal
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          callState={activeCall}
          onEndCall={() => setActiveCall(null)}
        />
      )}

      {/* Left Sidebar: Channels & Staff List */}
      <div className="md:col-span-4 border-r border-border bg-background/50 flex flex-col h-full overflow-hidden">
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
      <div className="md:col-span-8 flex flex-col h-full bg-surface overflow-hidden">
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
              const isImage = msg.content.startsWith("data:image");
              const isVideo = msg.content.startsWith("data:video");
              const isCloudFile = msg.content.startsWith("[FILE_ATTACHMENT]:");
              const isCallInvite = msg.content.includes("Started a Video Call") || msg.content.includes("Started a Voice Call") || msg.content.includes("Voice Call with");

              let cloudFileData: { name: string; size: string; url: string } | null = null;
              if (isCloudFile) {
                try {
                  cloudFileData = JSON.parse(msg.content.replace("[FILE_ATTACHMENT]:", ""));
                } catch {
                  cloudFileData = { name: "Cloud Attachment", size: "Heavy File", url: "#" };
                }
              }

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
                      ) : isImage ? (
                        <div className="py-1 space-y-1">
                          <img
                            src={msg.content}
                            alt="Photo"
                            onClick={() => setSelectedMedia(msg.content)}
                            className="max-w-[240px] sm:max-w-[320px] max-h-[300px] object-cover rounded-xl shadow-md border border-slate-200/50 cursor-pointer hover:opacity-90 transition-opacity"
                          />
                          <p className={`text-[9px] font-semibold ${isMe ? "text-white/80" : "text-muted"}`}>
                            📷 Image (Click to enlarge)
                          </p>
                        </div>
                      ) : isVideo ? (
                        <div className="py-1 space-y-1">
                          <video
                            controls
                            src={msg.content}
                            className="max-w-[240px] sm:max-w-[320px] max-h-[260px] rounded-xl shadow-md border border-slate-200/50"
                          />
                          <p className={`text-[9px] font-semibold ${isMe ? "text-white/80" : "text-muted"}`}>
                            🎥 Video
                          </p>
                        </div>
                      ) : isCloudFile && cloudFileData ? (
                        <div className="py-1 space-y-2 min-w-[220px]">
                          <div className="flex items-center gap-2.5">
                            <span className="text-2xl p-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20">
                              {cloudFileData.name.match(/\.(mp4|mov|avi|mkv)$/i)
                                ? "🎥"
                                : cloudFileData.name.match(/\.(zip|rar|7z|tar)$/i)
                                ? "🗜️"
                                : "📁"}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className={`font-extrabold text-xs truncate ${isMe ? "text-white" : "text-slate-900"}`} title={cloudFileData.name}>
                                {cloudFileData.name}
                              </p>
                              <span className={`text-[10px] font-semibold ${isMe ? "text-teal-200" : "text-teal-700"}`}>
                                {cloudFileData.size} • Cloudflare / Cloud File
                              </span>
                            </div>
                          </div>
                          <a
                            href={cloudFileData.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs shadow-xs transition-colors w-full justify-center"
                          >
                            <span>📥 Download 10 GB File</span>
                          </a>
                        </div>
                      ) : isCallInvite ? (
                        <div className="space-y-1.5 py-1">
                          <p className="font-bold flex items-center gap-1.5">
                            <span>📞</span>
                            <span>{msg.content}</span>
                          </p>
                          <button
                            type="button"
                            onClick={() => initiateCall("audio")}
                            className="text-xs font-bold bg-white text-teal-800 hover:bg-slate-100 px-3 py-1.5 rounded-lg shadow-xs transition-colors flex items-center gap-1"
                          >
                            <span>📞 Call Back / Join</span>
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
            /* Standard Input Bar with Mic & Attachment Buttons */
            <form onSubmit={handleSendMessage} className="flex items-center gap-2 relative">
              {/* Upload Progress Bar if uploading heavy file to Cloudflare R2 */}
              {uploadProgress > 0 && (
                <div className="absolute -top-9 left-2 right-2 bg-gradient-to-r from-teal-900 to-slate-900 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl flex items-center justify-between shadow-xl border border-teal-500/40 animate-pulse">
                  <span className="flex items-center gap-1.5">
                    <span className="animate-spin text-xs">⏳</span>
                    <span>Uploading directly to Cloudflare R2...</span>
                  </span>
                  <span className="font-mono text-emerald-400 font-extrabold">{uploadProgress}%</span>
                </div>
              )}

              {/* Hidden file input for images & videos */}
              <input
                type="file"
                ref={fileInputRef}
                accept="*/*"
                className="hidden"
                onChange={handleMediaSelect}
              />

              {/* 📎 Attach Image / Video Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingMedia}
                className="rounded-button bg-slate-100 hover:bg-slate-200 text-slate-700 text-base p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center transition-all border border-slate-200 shadow-xs cursor-pointer shrink-0"
                title="Send Image, Video or File"
              >
                {uploadingMedia ? <span className="animate-spin text-sm">⏳</span> : "📎"}
              </button>

              {/* ☁️ 10 GB Heavy File Button */}
              <button
                type="button"
                onClick={() => setShowCloudModal(true)}
                className="rounded-button bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold px-2.5 min-h-[44px] flex items-center gap-1 transition-all border border-teal-200 shadow-xs cursor-pointer shrink-0"
                title="Send Heavy File / 10 GB Video"
              >
                <span>☁️</span>
                <span className="hidden sm:inline">10 GB</span>
              </button>

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
                disabled={!inputText.trim() || sending || uploadingMedia}
                className="rounded-button bg-primary hover:bg-primary-hover text-white text-xs font-bold px-5 py-2.5 min-h-[44px] shadow-sm transition-all active:scale-[0.98] disabled:opacity-40 shrink-0"
              >
                {sending ? "..." : "Send"}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Cloudflare Setup & 10 GB Link Modal */}
      <CloudflareSetupModal
        isOpen={showCloudModal}
        onClose={() => setShowCloudModal(false)}
        onSendLink={async (name, url, size) => {
          const payload = `[FILE_ATTACHMENT]:${JSON.stringify({
            name,
            size: size || "10 GB",
            url,
          })}`;
          await sendMediaMessage(payload);
        }}
      />

      {/* Full-Screen Lightbox Modal for Shared Images */}
      {selectedMedia && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedMedia(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-3 text-white">
              <span className="text-xs font-bold bg-white/10 px-3 py-1 rounded-full">
                Preview Shared Media
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={selectedMedia}
                  download="shared-media.jpg"
                  className="text-xs font-bold bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                >
                  <span>📥</span>
                  <span>Download</span>
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedMedia(null)}
                  className="text-slate-300 hover:text-white text-lg px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
            <img
              src={selectedMedia}
              alt="Full preview"
              className="max-h-[80vh] max-w-full rounded-2xl shadow-2xl object-contain border border-white/10"
            />
          </div>
        </div>
      )}
    </div>
  );
}
