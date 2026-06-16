export type GameSoundEvent =
  | "countdownTick"
  | "roundStart"
  | "closeCall"
  | "panic"
  | "shieldPickup"
  | "shieldSave"
  | "gameOver"
  | "winner";

export type GameSoundTone = {
  frequency: number;
  durationSeconds: number;
  type: OscillatorType;
};

export type GameSoundSequence = {
  gain: number;
  tones: GameSoundTone[];
};

let audioContext: AudioContext | null = null;
let soundEnabled = true;

export function getGameSoundSequence(event: GameSoundEvent): GameSoundSequence {
  switch (event) {
    case "countdownTick":
      return {
        gain: 0.08,
        tones: [
          { frequency: 520, durationSeconds: 0.06, type: "square" },
          { frequency: 780, durationSeconds: 0.05, type: "square" },
        ],
      };
    case "roundStart":
      return {
        gain: 0.09,
        tones: [
          { frequency: 620, durationSeconds: 0.07, type: "triangle" },
          { frequency: 920, durationSeconds: 0.11, type: "triangle" },
        ],
      };
    case "closeCall":
      return {
        gain: 0.06,
        tones: [{ frequency: 880, durationSeconds: 0.08, type: "sawtooth" }],
      };
    case "panic":
      return {
        gain: 0.075,
        tones: [
          { frequency: 1040, durationSeconds: 0.05, type: "square" },
          { frequency: 760, durationSeconds: 0.07, type: "square" },
        ],
      };
    case "shieldPickup":
      return {
        gain: 0.07,
        tones: [
          { frequency: 420, durationSeconds: 0.08, type: "sine" },
          { frequency: 720, durationSeconds: 0.11, type: "sine" },
        ],
      };
    case "shieldSave":
      return {
        gain: 0.11,
        tones: [
          { frequency: 220, durationSeconds: 0.08, type: "triangle" },
          { frequency: 520, durationSeconds: 0.14, type: "triangle" },
        ],
      };
    case "winner":
      return {
        gain: 0.09,
        tones: [
          { frequency: 560, durationSeconds: 0.07, type: "square" },
          { frequency: 700, durationSeconds: 0.07, type: "square" },
          { frequency: 960, durationSeconds: 0.13, type: "square" },
        ],
      };
    case "gameOver":
      return {
        gain: 0.08,
        tones: [
          { frequency: 340, durationSeconds: 0.1, type: "sawtooth" },
          { frequency: 180, durationSeconds: 0.18, type: "sawtooth" },
        ],
      };
  }
}

export function primeGameAudio(): void {
  if (!soundEnabled) {
    return;
  }

  const context = getAudioContext();
  void context?.resume();
}

export function setGameSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
}

export function playGameSound(event: GameSoundEvent): void {
  if (!soundEnabled) {
    return;
  }

  const context = getAudioContext();
  if (context === null) {
    return;
  }

  void context.resume();
  const sequence = getGameSoundSequence(event);
  let startAt = context.currentTime;

  for (const tone of sequence.tones) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = tone.type;
    oscillator.frequency.setValueAtTime(tone.frequency, startAt);
    gain.gain.setValueAtTime(sequence.gain, startAt);
    gain.gain.exponentialRampToValueAtTime(0.001, startAt + tone.durationSeconds);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + tone.durationSeconds);
    startAt += tone.durationSeconds * 0.72;
  }
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (audioContext !== null) {
    return audioContext;
  }

  const AudioContextConstructor =
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (AudioContextConstructor === undefined) {
    return null;
  }

  audioContext = new AudioContextConstructor();
  return audioContext;
}
