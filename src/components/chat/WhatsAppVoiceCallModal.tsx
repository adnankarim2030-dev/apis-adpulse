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
  sdpOffer?: any;
}

interface WhatsAppVoiceCallModalProps {
  currentUserId: string;
  currentUserName: string;
  callState: ActiveCallState | null;
  onEndCall: () => void;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

export function WhatsAppVoiceCallModal({
  currentUserId,
  currentUserName,
  callState,
  onEndCall,
}: WhatsAppVoiceCallModalProps) {
  const [callStatus, setCallStatus] = useState<"DIALING" | "RINGING" | "INCOMING" | "CONNECTED" | "ENDED">("DIALING");
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const pollingRef = useRef<any>(null);
  const lastSignalTimeRef = useRef<string>(new Date().toISOString());

  // Cleanup all audio and WebRTC connections
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
      pcRef.current.close();
      pcRef.current = null;
    }
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

  // Handle Caller Side Initiation
  const startCallerFlow = useCallback(
    async (targetId: string, targetName: string, callId: string) => {
      try {
        setCallStatus("RINGING");
        startOutgoingRingback();

        // 1. Acquire Local Audio
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;

        // 2. Setup PeerConnection
        const pc = new RTCPeerConnection(ICE_SERVERS);
        pcRef.current = pc;

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        // When remote track arrives, attach to audio element
        pc.ontrack = (event) => {
          if (remoteAudioRef.current && event.streams[0]) {
            remoteAudioRef.current.srcObject = event.streams[0];
            remoteAudioRef.current.play().catch(() => {});
          }
        };

        // Handle ICE Candidates
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
        });
        await pc.setLocalDescription(offer);

        // 4. Send Initiate Signal
        await fetch("/api/calls/signal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "CALL_INITIATE",
            callId,
            targetUserId: targetId,
            targetName,
            sdp: offer,
          }),
        });

        // 5. Poll for Answer or End
        pollingRef.current = setInterval(async () => {
          try {
            const res = await fetch(`/api/calls/signal?callId=${encodeURIComponent(callId)}&since=${encodeURIComponent(lastSignalTimeRef.current)}`);
            const data = await res.json();
            if (data.signals && data.signals.length > 0) {
              for (const sig of data.signals) {
                lastSignalTimeRef.current = sig.createdAt;

                if (sig.action === "CALL_ANSWER" && sig.metadata?.sdpAnswer) {
                  stopCallAudio();
                  await pc.setRemoteDescription(new RTCSessionDescription(sig.metadata.sdpAnswer));
                  setCallStatus("CONNECTED");
                } else if (sig.action === "CALL_ICE" && sig.metadata?.candidate) {
                  try {
                    await pc.addIceCandidate(new RTCIceCandidate(sig.metadata.candidate));
                  } catch {}
                } else if (sig.action === "CALL_END") {
                  cleanupCall();
                  setCallStatus("ENDED");
                  setTimeout(onEndCall, 1500);
                }
              }
            }
          } catch {}
        }, 1200);
      } catch (err: any) {
        setErrorMessage("Microphone access was denied or audio device not found.");
        stopCallAudio();
        setCallStatus("ENDED");
        setTimeout(onEndCall, 2500);
      }
    },
    [cleanupCall, onEndCall]
  );

  // Handle Receiver Side Acceptance
  const acceptCall = async () => {
    if (!callState || !callState.sdpOffer) return;
    try {
      stopCallAudio();
      setCallStatus("CONNECTED");

      // 1. Acquire Local Audio
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      // 2. Setup PeerConnection
      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (remoteAudioRef.current && event.streams[0]) {
          remoteAudioRef.current.srcObject = event.streams[0];
          remoteAudioRef.current.play().catch(() => {});
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

      // Poll for ICE candidates or Call End
      pollingRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/calls/signal?callId=${encodeURIComponent(callState.callId)}&since=${encodeURIComponent(lastSignalTimeRef.current)}`);
          const data = await res.json();
          if (data.signals && data.signals.length > 0) {
            for (const sig of data.signals) {
              lastSignalTimeRef.current = sig.createdAt;
              if (sig.action === "CALL_ICE" && sig.metadata?.candidate) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(sig.metadata.candidate));
                } catch {}
              } else if (sig.action === "CALL_END") {
                cleanupCall();
                setCallStatus("ENDED");
                setTimeout(onEndCall, 1500);
              }
            }
          }
        } catch {}
      }, 1200);
    } catch (err: any) {
      setErrorMessage("Microphone access failed.");
      stopCallAudio();
      setCallStatus("ENDED");
      setTimeout(onEndCall, 2500);
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
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // Mount logic based on caller vs receiver
  useEffect(() => {
    if (!callState) return;

    if (callState.isCaller) {
      startCallerFlow(callState.partnerId, callState.partnerName, callState.callId);
    } else {
      setCallStatus("INCOMING");
      startIncomingRingtone();
    }

    return () => {
      cleanupCall();
    };
  }, [callState, startCallerFlow, cleanupCall]);

  if (!callState) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Hidden audio element for receiving remote voice */}
      <audio ref={remoteAudioRef} autoPlay />

      <div className="relative w-full max-w-sm sm:max-w-md rounded-3xl bg-gradient-to-b from-[#111B21] via-[#0C1317] to-[#111B21] border border-emerald-500/30 shadow-2xl p-6 flex flex-col items-center text-center text-white overflow-hidden">
        {/* Top Encrypted Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-[11px] font-semibold text-emerald-400 mb-6">
          <span>🔒</span>
          <span>End-to-End Encrypted Voice Call</span>
        </div>

        {/* User Avatar with Pulsing Radar Effect */}
        <div className="relative my-4">
          {(callStatus === "RINGING" || callStatus === "INCOMING" || callStatus === "CONNECTED") && (
            <div className="absolute inset-0 rounded-full animate-ping opacity-25 bg-emerald-500" />
          )}
          <div className="relative p-1.5 rounded-full border-2 border-emerald-400/80 shadow-lg">
            <Avatar name={callState.partnerName} size={96} />
          </div>
        </div>

        {/* Partner Name & Title */}
        <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white mt-2">
          {callState.partnerName}
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          {callState.partnerTitle || "Staff Member"}
        </p>

        {/* Call Status / Duration / Errors */}
        <div className="my-5 min-h-[32px] flex items-center justify-center">
          {errorMessage ? (
            <p className="text-xs font-semibold text-rose-400 bg-rose-950/60 px-3 py-1.5 rounded-lg border border-rose-800">
              ⚠️ {errorMessage}
            </p>
          ) : callStatus === "RINGING" ? (
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <span className="animate-spin text-base">📞</span>
              <span>Ringing...</span>
            </div>
          ) : callStatus === "INCOMING" ? (
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm animate-pulse">
              <span className="text-base">🔔</span>
              <span>Incoming Voice Call...</span>
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

        {/* Audio Waveform Graphic while Connected */}
        {callStatus === "CONNECTED" && (
          <div className="flex items-center justify-center gap-1.5 my-3 h-8">
            <span className="w-1.5 bg-emerald-400 rounded-full animate-bounce h-4" />
            <span className="w-1.5 bg-emerald-400 rounded-full animate-bounce h-7 delay-75" />
            <span className="w-1.5 bg-emerald-400 rounded-full animate-bounce h-5 delay-150" />
            <span className="w-1.5 bg-emerald-400 rounded-full animate-bounce h-8 delay-200" />
            <span className="w-1.5 bg-emerald-400 rounded-full animate-bounce h-4 delay-300" />
          </div>
        )}

        {/* Bottom Action Controls */}
        <div className="w-full mt-6 pt-5 border-t border-slate-800 flex items-center justify-center gap-6">
          {callStatus === "INCOMING" ? (
            <>
              {/* Decline Button (Red) */}
              <button
                type="button"
                onClick={declineCall}
                className="flex flex-col items-center gap-1.5 group cursor-pointer"
              >
                <div className="w-14 h-14 rounded-full bg-rose-600 group-hover:bg-rose-500 shadow-lg shadow-rose-950 flex items-center justify-center text-xl transition-all transform group-hover:scale-105">
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
                <div className="w-14 h-14 rounded-full bg-emerald-600 group-hover:bg-emerald-500 shadow-lg shadow-emerald-950 flex items-center justify-center text-xl transition-all transform group-hover:scale-110 animate-bounce">
                  📞
                </div>
                <span className="text-[11px] font-bold text-emerald-300">Accept</span>
              </button>
            </>
          ) : (
            <>
              {/* Mute / Unmute Button */}
              {callStatus === "CONNECTED" && (
                <button
                  type="button"
                  onClick={toggleMute}
                  className={`flex flex-col items-center gap-1.5 cursor-pointer ${
                    isMuted ? "text-amber-400" : "text-slate-300 hover:text-white"
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-lg border transition-all ${
                      isMuted
                        ? "bg-amber-500/20 border-amber-400"
                        : "bg-slate-800/80 border-slate-700 hover:bg-slate-700"
                    }`}
                  >
                    {isMuted ? "🔇" : "🎙️"}
                  </div>
                  <span className="text-[11px] font-semibold">{isMuted ? "Unmute" : "Mute"}</span>
                </button>
              )}

              {/* End Call Button (Red Hangup) */}
              <button
                type="button"
                onClick={handleHangUp}
                className="flex flex-col items-center gap-1.5 group cursor-pointer"
              >
                <div className="w-14 h-14 rounded-full bg-rose-600 group-hover:bg-rose-500 shadow-xl shadow-rose-950/80 flex items-center justify-center text-xl transition-all transform group-hover:scale-105 rotate-[135deg]">
                  📞
                </div>
                <span className="text-[11px] font-bold text-rose-300">End Call</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
