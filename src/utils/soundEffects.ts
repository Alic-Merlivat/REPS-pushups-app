/**
 * Web Audio API synthesized sound effects.
 * No external network assets required — 100% reliable, offline-ready & instant.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * High-impact comic "Butt Slap" / Smack sound effect.
 * Combines:
 * 1. High-frequency skin-on-skin acoustic slap transient (filtered white noise burst)
 * 2. Rapid downward pitch-bend resonant fleshy thump (180Hz -> 50Hz)
 * 3. Warm body resonance decay
 */
export function playButtSlapSound(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // --- 1. SKIN SLAP TRANSIENT (Noise Burst) ---
    const bufferSize = Math.floor(ctx.sampleRate * 0.05); // 50ms burst
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    // Bandpass filter to isolate crisp fleshy slap frequencies
    const slapFilter = ctx.createBiquadFilter();
    slapFilter.type = 'bandpass';
    slapFilter.frequency.setValueAtTime(2600, now);
    slapFilter.Q.setValueAtTime(2.2, now);

    const slapGain = ctx.createGain();
    slapGain.gain.setValueAtTime(1.0, now);
    slapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    whiteNoise.connect(slapFilter);
    slapFilter.connect(slapGain);
    slapGain.connect(ctx.destination);

    whiteNoise.start(now);
    whiteNoise.stop(now + 0.05);

    // --- 2. FLESHY BODY THUMP (Pitch Drop Sine) ---
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();

    osc.type = 'sine';
    // Pitch drops sharply like an elastic skin impact
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.08);

    oscGain.gain.setValueAtTime(0.9, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.13);

    // --- 3. SUBTLE SECONDARY RESONANCE ---
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();

    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(110, now + 0.005);
    subOsc.frequency.exponentialRampToValueAtTime(45, now + 0.07);

    subGain.gain.setValueAtTime(0.4, now + 0.005);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    subOsc.connect(subGain);
    subGain.connect(ctx.destination);

    subOsc.start(now + 0.005);
    subOsc.stop(now + 0.1);
  } catch (err) {
    console.warn('Audio playback error:', err);
  }
}
