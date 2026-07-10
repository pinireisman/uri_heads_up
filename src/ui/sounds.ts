// Original feedback sounds, synthesized — no audio assets (PRD Q12).
let ctx: AudioContext | undefined;

function tone(at: number, freq: number, dur: number): void {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  // short attack/decay envelope to avoid clicks
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.25, at + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + dur + 0.02);
}

export function playFeedback(kind: "correct" | "skipped"): void {
  try {
    // lazily created after a user gesture (starting a round involves taps),
    // so autoplay policies allow it
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    const t = ctx.currentTime;
    if (kind === "correct") {
      tone(t, 660, 0.12); // rising major third: "yes!"
      tone(t + 0.1, 880, 0.18);
    } else {
      tone(t, 392, 0.12); // falling: "moving on"
      tone(t + 0.1, 294, 0.18);
    }
  } catch {
    // no audio available — gameplay continues silently
  }
}
