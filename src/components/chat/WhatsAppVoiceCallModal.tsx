"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Avatar } from "@/components/ui/Avatar";
import {
  startOutgoingRingback,
  startIncomingRingtone,
  stopCallAudio,
} from "@/lib/call-audio";

export interface ActiveCallState {
  callId: string;
  isCaller: boolean;
  partnerId: string;
  partnerName: string;
  partnerTitle?: string;
  callType?: "audio" | "video";
  sdpOffer?: any;
}

interface WhatsAppVoiceCallModalProps {
  currentUserId: string;
  currentUserName: string;
  callState: ActiveCallState | null;
  onEndCall: () => void;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ],
};

export function WhatsAppVoiceCallModal({
  currentUserId,
  currentUserName,
  callState,
  onEndCall,
}: WhatsAppVoiceCallModalProps) {
  const isVideo = callState?.callType === "video";
  const [callStatus, setCallStatus] = useState<"DIALING" | "RINGING" | "INCOMING" | "CONNECTED" | "ENDED">("DIALING");
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isRetryingPermission, setIsRetryingPermission] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const pollingRef = useRef<any>(null);
  const lastSignalTimeRef = useRef<string>(new Date().toISOString());
  const iceCandidateQueueRef = useRef<RTCIceCandidateInit[]>([]);

  // Cleanup all streams, audio, intervals and WebRTC connections
  const cleanupCall = useCallback(() => {
    stopCallAudio();
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch {}
      pcRef.current = null;
    }
    iceCandidateQueueRef.current = [];
  }, []);

  // Format call duration MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainder.toString().padStart(2, "0")}`;
  };

  // Timer while connected
  useEffect(() => {
    if (callStatus === "CONNECTED") {
      const interval = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [callStatus]);

  // Mobile Safe Media Stream Acquisition
  const acquireMediaStream = async (wantsVideo: boolean): Promise<MediaStream> => {
    // Check if mediaDevices API is available (blocked on HTTP non-localhost on mobile)
    if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error(
        "SECURE_CONTEXT_REQUIRED: Mobile browsers require HTTPS for Microphone/Camera access. Please use https://apis-management-system.vercel.app or enable browser permissions."
      );
    }

    try {
      // 1. Try with high quality echo cancellation and noise suppression
      return await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: wantsVideo
          ? {
              facingMode: "user",
              width: { ideal: 640 },
              height: { ideal: 480 },
            }
          : false,
      });
    } catch (err: any) {
      console.warn("Advanced audio constraints failed, trying basic audio...", err);
      // 2. Fallback to basic audio
      return await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: wantsVideo,
      });
    }
  };

  // Process any queued ICE candidates once remoteDescription is set
  const flushQueuedIceCandidates = async (pc: RTCPeerConnection) => {
    while (iceCandidateQueueRef.current.length > 0) {
      const cand = iceCandidateQueueRef.current.shift();
      if (cand) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
        } catch (e) {
          console.warn("Failed to add queued ICE candidate:", e);
        }
      }
    }
  };

  // Handle Caller Side Initiation
  const startCallerFlow = useCallback(
    async (targetId: string, targetName: string, callId: string, wantsVideo: boolean) => {
      try {
        setPermissionError(null);
        setCallStatus("RINGING");
        startOutgoingRingback();

        // 1. Acquire Local Audio/Video
        const stream = await acquireMediaStream(wantsVideo);
        localStreamRef.current = stream;

        // Render local video preview if video call
        if (wantsVideo && localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // 2. Setup PeerConnection
        const pc = new RTCPeerConnection(ICE_SERVERS);
        pcRef.current = pc;

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        // When remote track arrives, attach to audio/video elements
        pc.ontrack = (event) => {
          const remoteStream = event.streams[0];
          if (!remoteStream) return;

          // Remote Audio
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = remoteStream;
            (remoteAudioRef.current as any).playsInline = true;
            const playPromise = remoteAudioRef.current.play();
            if (playPromise !== undefined) {
              playPromise.catch((e) => console.warn("Remote audio autoplay blocked:", e));
            }
          }

          // Remote Video
          if (wantsVideo && remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
            remoteVideoRef.current.playsInline = true;
            remoteVideoRef.current.play().catch(() => {});
          }
        };

        // Handle ICE Candidates from Local Peer
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            fetch("/api/calls/signal", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "CALL_ICE",
                callId,
                candidate: event.candidate,
              }),
            }).catch(() => {});
          }
        };

        // 3. Create Offer
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: wantsVideo,
        });
        await pc.setLocalDescription(offer);

        // 4. Send Initiate Signal to Callee
        await fetch("/api/calls/signal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "CALL_INITIATE",
            callId,
            targetUserId: targetId,
            targetName,
            sdp: offer,
            callType: wantsVideo ? "video" : "audio",
          }),
        });

        // 5. Poll for Answer or End
        pollingRef.current = setInterval(async () => {
          try {
            const res = await fetch(
              `/api/calls/signal?callId=${encodeURIComponent(callId)}&since=${encodeURIComponent(lastSignalTimeRef.current)}`
            );
            const data = await res.json();
            if (data.signals && data.signals.length > 0) {
              for (const sig of data.signals) {
                lastSignalTimeRef.current = sig.createdAt;

                // Ignore signals generated by ourself
                if (sig.actorId === currentUserId) continue;

                if (sig.action === "CALL_ANSWER" && sig.metadata?.sdpAnswer) {
                  stopCallAudio();
                  await pc.setRemoteDescription(new RTCSessionDescription(sig.metadata.sdpAnswer));
                  await flushQueuedIceCandidates(pc);
                  setCallStatus("CONNECTED");
                } else if (sig.action === "CALL_ICE" && sig.metadata?.candidate) {
                  if (pc.remoteDescription) {
                    try {
                      await pc.addIceCandidate(new RTCIceCandidate(sig.metadata.candidate));
                    } catch {}
                  } else {
                    iceCandidateQueueRef.current.push(sig.metadata.candidate);
                  }
                } else if (sig.action === "CALL_END" || sig.action === "CALL_REJECT") {
                  cleanupCall();
                  setCallStatus("ENDED");
                  setTimeout(onEndCall, 1500);
                }
              }
            }
          } catch {}
        }, 1000);
      } catch (err: any) {
        console.error("Caller setup error:", err);
        stopCallAudio();
        const msg = String(err.message || "");
        if (msg.includes("SECURE_CONTEXT_REQUIRED")) {
          setPermissionError(
            "Mobile requires HTTPS! Please access via https://apis-management-system.vercel.app for full microphone & camera access."
          );
        } else if (err.name === "NotAllowedError" || msg.includes("denied")) {
          setPermissionError(
            "Microphone permission blocked! Tap the 🔒 lock / settings icon in your browser address bar and choose 'Allow'."
          );
        } else {
          setPermissionError("Audio device or microphone not found on this device.");
        }
      }
    },
    [cleanupCall, currentUserId, onEndCall]
  );

  // Handle Receiver Side Acceptance
  const acceptCall = async () => {
    if (!callState || !callState.sdpOffer) return;
    try {
      setPermissionError(null);
      setIsRetryingPermission(true);
      stopCallAudio();

      // 1. Acquire Local Audio/Video
      const stream = await acquireMediaStream(isVideo);
      localStreamRef.current = stream;

      if (isVideo && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // 2. Setup PeerConnection
      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        const remoteStream = event.streams[0];
        if (!remoteStream) return;

        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStream;
          (remoteAudioRef.current as any).playsInline = true;
          const playPromise = remoteAudioRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch((e) => console.warn("Remote audio play blocked:", e));
          }
        }

        if (isVideo && remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.playsInline = true;
          remoteVideoRef.current.play().catch(() => {});
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          fetch("/api/calls/signal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "CALL_ICE",
              callId: callState.callId,
              candidate: event.candidate,
            }),
          }).catch(() => {});
        }
      };

      // Set Remote Description (Caller's Offer)
      await pc.setRemoteDescription(new RTCSessionDescription(callState.sdpOffer));

      // Flush any early arriving ICE candidates
      await flushQueuedIceCandidates(pc);

      // Create Answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Send Answer Signal
      await fetch("/api/calls/signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CALL_ANSWER",
          callId: callState.callId,
          sdp: answer,
        }),
      });

      setCallStatus("CONNECTED");
      setIsRetryingPermission(false);

      // Poll for ICE candidates or Call End
      pollingRef.current = setInterval(async () => {
        try {
          const res = await fetch(
            `/api/calls/signal?callId=${encodeURIComponent(callState.callId)}&since=${encodeURIComponent(lastSignalTimeRef.current)}`
          );
          const data = await res.json();
          if (data.signals && data.signals.length > 0) {
            for (const sig of data.signals) {
              lastSignalTimeRef.current = sig.createdAt;

              // Ignore signals generated by ourself
              if (sig.actorId === currentUserId) continue;

              if (sig.action === "CALL_ICE" && sig.metadata?.candidate) {
                if (pc.remoteDescription) {
                  try {
                    await pc.addIceCandidate(new RTCIceCandidate(sig.metadata.candidate));
                  } catch {}
                } else {
                  iceCandidateQueueRef.current.push(sig.metadata.candidate);
                }
              } else if (sig.action === "CALL_END" || sig.action === "CALL_REJECT") {
                cleanupCall();
                setCallStatus("ENDED");
                setTimeout(onEndCall, 1500);
              }
            }
          }
        } catch {}
      }, 1000);
    } catch (err: any) {
      console.error("Receiver accept error:", err);
      setIsRetryingPermission(false);
      stopCallAudio();
      const msg = String(err.message || "");
      if (msg.includes("SECURE_CONTEXT_REQUIRED")) {
        setPermissionError(
          "Mobile requires HTTPS! Please access via https://apis-management-system.vercel.app for microphone permission."
        );
      } else if (err.name === "NotAllowedError" || msg.includes("denied")) {
        setPermissionError(
          "Microphone permission blocked! Tap the 🔒 lock / settings icon in your browser address bar and choose 'Allow'."
        );
      } else {
        setPermissionError("Microphone access failed. Please check device permissions.");
      }
    }
  };

  // Decline/Reject Call
  const declineCall = async () => {
    if (!callState) return;
    cleanupCall();
    setCallStatus("ENDED");
    try {
      await fetch("/api/calls/signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CALL_REJECT",
          callId: callState.callId,
          reason: "REJECTED",
        }),
      });
    } catch {}
    onEndCall();
  };

  // End Active Call
  const handleHangUp = async () => {
    if (!callState) return;
    cleanupCall();
    setCallStatus("ENDED");
    try {
      await fetch("/api/calls/signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CALL_END",
          callId: callState.callId,
          reason: "USER_HANGUP",
        }),
      });
    } catch {}
    setTimeout(onEndCall, 500);
  };

  // Toggle Microphone Mute
  const toggleAudioMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioMuted(!audioTrack.enabled);
      }
    }
  };

  // Toggle Camera Mute
  const toggleVideoMute = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoMuted(!videoTrack.enabled);
      }
    }
  };

  // Mount logic based on caller vs receiver
  useEffect(() => {
    if (!callState) return;

    if (callState.isCaller) {
      startCallerFlow(callState.partnerId, callState.partnerName, callState.callId, isVideo);
    } else {
      setCallStatus("INCOMING");
      startIncomingRingtone();
    }

    return () => {
      cleanupCall();
    };
  }, [callState, isVideo, startCallerFlow, cleanupCall]);

  if (!callState) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      {/* Hidden audio element for receiving remote voice with mobile playsInline */}
      <audio ref={remoteAudioRef} autoPlay playsInline controls={false} />

      <div className="relative w-full max-w-sm sm:max-w-md rounded-3xl bg-gradient-to-b from-[#111B21] via-[#0C1317] to-[#111B21] border border-emerald-500/30 shadow-2xl p-5 sm:p-6 flex flex-col items-center text-center text-white overflow-hidden">
        {/* Top Encrypted Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-[11px] font-semibold text-emerald-400 mb-4">
          <span>🔒</span>
          <span>{isVideo ? "End-to-End Encrypted Video Call" : "End-to-End Encrypted Voice Call"}</span>
        </div>

        {/* Video Call Screens or Avatar */}
        {isVideo && callStatus === "CONNECTED" ? (
          <div className="relative w-full aspect-video rounded-2xl bg-black overflow-hidden my-3 border border-slate-800 shadow-inner">
            {/* Remote Video Stream */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            {/* Local Video Stream in Picture-in-Picture */}
            <div className="absolute bottom-2 right-2 w-24 sm:w-32 aspect-video rounded-xl bg-slate-900 border-2 border-emerald-500 overflow-hidden shadow-lg z-10">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
            </div>
          </div>
        ) : (
          /* User Avatar with Pulsing Radar Effect */
          <div className="relative my-4">
            {(callStatus === "RINGING" || callStatus === "INCOMING" || callStatus === "CONNECTED") && (
              <div className="absolute inset-0 rounded-full animate-ping opacity-25 bg-emerald-500" />
            )}
            <div className="relative p-1.5 rounded-full border-2 border-emerald-400/80 shadow-lg">
              <Avatar name={callState.partnerName} size={96} />
            </div>
          </div>
        )}

        {/* Partner Name & Title */}
        <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white mt-1 truncate max-w-full">
          {callState.partnerName}
        </h3>
        <p className="text-xs text-slate-400 mt-0.5 truncate max-w-full">
          {callState.partnerTitle || "Staff Member"}
        </p>

        {/* Call Status / Duration / Errors */}
        <div className="my-4 min-h-[36px] flex flex-col items-center justify-center">
          {permissionError ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-rose-300 bg-rose-950/70 p-2.5 rounded-xl border border-rose-800 text-left leading-relaxed">
                ⚠️ {permissionError}
              </p>
              <button
                type="button"
                onClick={() => {
                  setPermissionError(null);
                  if (callState.isCaller) {
                    startCallerFlow(callState.partnerId, callState.partnerName, callState.callId, isVideo);
                  } else {
                    acceptCall();
                  }
                }}
                disabled={isRetryingPermission}
                className="text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg shadow-sm transition-all"
              >
                {isRetryingPermission ? "Requesting..." : "🔄 Try Permission Again"}
              </button>
            </div>
          ) : callStatus === "RINGING" ? (
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <span className="animate-spin text-base">{isVideo ? "🎥" : "📞"}</span>
              <span>Ringing...</span>
            </div>
          ) : callStatus === "INCOMING" ? (
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm animate-pulse">
              <span className="text-base">{isVideo ? "🎥" : "🔔"}</span>
              <span>{isVideo ? "Incoming Video Call..." : "Incoming Voice Call..."}</span>
            </div>
          ) : callStatus === "CONNECTED" ? (
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono font-bold text-base text-white tracking-wider">
                {formatTime(duration)}
              </span>
            </div>
          ) : (
            <p className="text-xs font-medium text-slate-400">Call Ended</p>
          )}
        </div>

        {/* Audio Waveform Graphic while Connected (Audio mode) */}
        {!isVideo && callStatus === "CONNECTED" && (
          <div className="flex items-center justify-center gap-1.5 my-2 h-7">
            <span className="w-1.5 bg-emerald-400 rounded-full animate-bounce h-3" />
            <span className="w-1.5 bg-emerald-400 rounded-full animate-bounce h-6 delay-75" />
            <span className="w-1.5 bg-emerald-400 rounded-full animate-bounce h-4 delay-150" />
            <span className="w-1.5 bg-emerald-400 rounded-full animate-bounce h-7 delay-200" />
            <span className="w-1.5 bg-emerald-400 rounded-full animate-bounce h-3 delay-300" />
          </div>
        )}

        {/* Bottom Action Controls */}
        <div className="w-full mt-4 pt-4 border-t border-slate-800 flex items-center justify-center gap-4 sm:gap-6">
          {callStatus === "INCOMING" ? (
            <>
              {/* Decline Button (Red) */}
              <button
                type="button"
                onClick={declineCall}
                className="flex flex-col items-center gap-1.5 group cursor-pointer"
              >
                <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-rose-600 group-hover:bg-rose-500 shadow-lg shadow-rose-950 flex items-center justify-center text-xl transition-all transform group-hover:scale-105">
                  📞
                </div>
                <span className="text-[11px] font-bold text-rose-300">Decline</span>
              </button>

              {/* Accept Button (Green) */}
              <button
                type="button"
                onClick={acceptCall}
                className="flex flex-col items-center gap-1.5 group cursor-pointer"
              >
                <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-emerald-600 group-hover:bg-emerald-500 shadow-lg shadow-emerald-950 flex items-center justify-center text-xl transition-all transform group-hover:scale-110 animate-bounce">
                  {isVideo ? "🎥" : "📞"}
                </div>
                <span className="text-[11px] font-bold text-emerald-300">Accept</span>
              </button>
            </>
          ) : (
            <>
              {/* Mute / Unmute Audio */}
              {callStatus === "CONNECTED" && (
                <button
                  type="button"
                  onClick={toggleAudioMute}
                  className={`flex flex-col items-center gap-1 cursor-pointer ${
                    isAudioMuted ? "text-amber-400" : "text-slate-300 hover:text-white"
                  }`}
                >
                  <div
                    className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-lg border transition-all ${
                      isAudioMuted
                        ? "bg-amber-500/20 border-amber-400"
                        : "bg-slate-800/80 border-slate-700 hover:bg-slate-700"
                    }`}
                  >
                    {isAudioMuted ? "🔇" : "🎙️"}
                  </div>
                  <span className="text-[10px] font-semibold">{isAudioMuted ? "Unmute" : "Mute"}</span>
                </button>
              )}

              {/* Mute / Unmute Video (if video call) */}
              {isVideo && callStatus === "CONNECTED" && (
                <button
                  type="button"
                  onClick={toggleVideoMute}
                  className={`flex flex-col items-center gap-1 cursor-pointer ${
                    isVideoMuted ? "text-amber-400" : "text-slate-300 hover:text-white"
                  }`}
                >
                  <div
                    className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-lg border transition-all ${
                      isVideoMuted
                        ? "bg-amber-500/20 border-amber-400"
                        : "bg-slate-800/80 border-slate-700 hover:bg-slate-700"
                    }`}
                  >
                    {isVideoMuted ? "🚫" : "🎥"}
                  </div>
                  <span className="text-[10px] font-semibold">{isVideoMuted ? "Cam Off" : "Cam On"}</span>
                </button>
              )}

              {/* End Call Button (Red Hangup) */}
              <button
                type="button"
                onClick={handleHangUp}
                className="flex flex-col items-center gap-1 group cursor-pointer"
              >
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-rose-600 group-hover:bg-rose-500 shadow-xl shadow-rose-950/80 flex items-center justify-center text-xl transition-all transform group-hover:scale-105 rotate-[135deg]">
                  📞
                </div>
                <span className="text-[10px] font-bold text-rose-300">End</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
