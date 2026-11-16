// WhatsApp-style Ringtone and Ringback synthesizers using standard Web Audio API
// 100% in-browser, zero external mp3 files required

let audioCtx: AudioContext | null = null;
let activeInterval: any = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx || audioCtx.state === "closed") {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      audioCtx = new AudioCtx();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function stopCallAudio() {
  if (activeInterval) {
    clearInterval(activeInterval);
    activeInterval = null;
  }
  if (audioCtx && audioCtx.state !== "closed") {
    try {
      audioCtx.close().catch(() => {});
    } catch {}
    audioCtx = null;
  }
}

/**
 * Play standard outgoing ringback tone:
 * 440Hz + 480Hz dual sine tone pulsed for 1.8s every 4s
 */
export function startOutgoingRingback() {
  stopCallAudio();
  const ctx = getAudioContext();
  if (!ctx) return;

  const playPulse = () => {
    if (!ctx || ctx.state === "closed") return;
    try {
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sine";
      osc1.frequency.setValueAtTime(440, now);
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(480, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.1);
      gain.gain.setValueAtTime(0.08, now + 1.8);
      gain.gain.linearRampToValueAtTime(0, now + 1.9);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.95);
      osc2.stop(now + 1.95);
    } catch {}
  };

  playPulse();
  activeInterval = setInterval(playPulse, 4000);
}

/**
 * Play WhatsApp-style melodic incoming chime ringtone
 */
export function startIncomingRingtone() {
  stopCallAudio();
  const ctx = getAudioContext();
  if (!ctx) return;

  const playMelody = () => {
    if (!ctx || ctx.state === "closed") return;
    try {
      const now = ctx.currentTime;
      const notes = [
        { f: 523.25, start: 0.0, dur: 0.2 }, // C5
        { f: 659.25, start: 0.22, dur: 0.2 }, // E5
        { f: 783.99, start: 0.44, dur: 0.25 }, // G5
        { f: 1046.5, start: 0.72, dur: 0.4 }, // C6
        { f: 783.99, start: 1.15, dur: 0.25 }, // G5
        { f: 1046.5, start: 1.45, dur: 0.5 }, // C6
      ];

      notes.forEach((note) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(note.f, now + note.start);

        gain.gain.setValueAtTime(0, now + note.start);
        gain.gain.linearRampToValueAtTime(0.12, now + note.start + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + note.start + note.dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + note.start);
        osc.stop(now + note.start + note.dur + 0.05);
      });
    } catch {}
  };

  playMelody();
  activeInterval = setInterval(playMelody, 2800);
}
