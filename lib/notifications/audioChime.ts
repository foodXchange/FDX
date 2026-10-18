// Gentle, non-intrusive notification chime using standard Web Audio API
export function playNotificationChime(): void {
  if (typeof window === "undefined") return;

  try {
    const isMuted = localStorage.getItem("fdx_admin_sound_muted") === "true";
    if (isMuted) return;

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    
    // Resume context if suspended by browser autoplay policy
    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    const now = ctx.currentTime;

    // Dual-tone gentle bell chime (C6 -> G6)
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc2.type = "triangle";

    osc1.frequency.setValueAtTime(1046.5, now); // C6
    osc1.frequency.exponentialRampToValueAtTime(1567.98, now + 0.15); // G6

    osc2.frequency.setValueAtTime(523.25, now); // C5 harmonic
    osc2.frequency.exponentialRampToValueAtTime(783.99, now + 0.15);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.45);
    osc2.stop(now + 0.45);
  } catch {
    // Gracefully ignore audio errors (e.g. strict autoplay blocking before first interaction)
  }
}
