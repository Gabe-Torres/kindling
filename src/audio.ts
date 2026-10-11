function storageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private mode can reject storage. The toggle still lasts for this visit.
  }
}

export type Audio = {
  muted: () => boolean;
  unlock: () => void;
  toggle: () => boolean;
  setMuted: (muted: boolean) => void;
  blip: () => void;
  hit: () => void;
  super: () => void;
  faint: () => void;
  evolve: () => void;
  heal: () => void;
  gems: () => void;
  startTown: () => void;
  stopTown: () => void;
};

export function createAudio(): Audio {
  let ctx: AudioContext | null = null;
  let muted = storageGet('kindling-muted') === '1';
  let timer: ReturnType<typeof setInterval> | null = null;
  let step = 0;

  function ac(): AudioContext | null {
    if (muted) return null;
    try {
      if (!ctx) ctx = new AudioContext();
      if (ctx.state === 'suspended') void ctx.resume();
      return ctx;
    } catch {
      return null;
    }
  }

  function tone(freq: number, dur: number, type: OscillatorType, gain: number, slide = 0, delay = 0): void {
    const c = ac();
    if (!c) return;
    const t = c.currentTime + delay;
    const osc = c.createOscillator();
    const amp = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.linearRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(amp);
    amp.connect(c.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function townTick(): void {
    if (muted || !timer) return;
    const notes = [392, 440, 494, 587, 494, 440];
    tone(notes[step % notes.length], 0.55, 'sine', 0.018);
    if (step % 2 === 0) tone(notes[step % notes.length] / 2, 0.7, 'triangle', 0.01);
    step += 1;
  }

  return {
    muted: () => muted,
    unlock: () => {
      ac();
    },
    setMuted: (next) => {
      muted = next;
      storageSet('kindling-muted', muted ? '1' : '0');
      if (muted && timer) {
        clearInterval(timer);
        timer = null;
      }
    },
    toggle: () => {
      muted = !muted;
      storageSet('kindling-muted', muted ? '1' : '0');
      if (muted && timer) {
        clearInterval(timer);
        timer = null;
      }
      return muted;
    },
    blip: () => tone(620, 0.05, 'square', 0.03, 80),
    hit: () => {
      tone(180, 0.09, 'square', 0.04, -80);
      tone(90, 0.12, 'triangle', 0.03);
    },
    super: () => {
      tone(520, 0.08, 'square', 0.035, 140);
      tone(780, 0.1, 'square', 0.03, 80, 0.06);
    },
    faint: () => tone(240, 0.28, 'sawtooth', 0.03, -160),
    evolve: () => {
      [523, 659, 784, 1046].forEach((freq, i) => tone(freq, 0.18, 'triangle', 0.04, 0, i * 0.12));
    },
    heal: () => {
      tone(440, 0.1, 'sine', 0.03, 40);
      tone(660, 0.16, 'sine', 0.03, 20, 0.08);
    },
    gems: () => {
      tone(880, 0.08, 'sine', 0.03, 40);
      tone(1174, 0.12, 'triangle', 0.025, 20, 0.07);
    },
    startTown: () => {
      if (timer || muted) return;
      townTick();
      timer = setInterval(townTick, 680);
    },
    stopTown: () => {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    },
  };
}
