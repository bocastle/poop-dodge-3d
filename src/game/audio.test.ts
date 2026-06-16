import { afterEach, describe, expect, it, vi } from "vitest";
import { getGameSoundSequence, playGameSound, setGameSoundEnabled } from "./audio";

describe("game audio recipes", () => {
  afterEach(() => {
    setGameSoundEnabled(true);
    vi.unstubAllGlobals();
  });

  it("uses short arcade ticks for multiplayer countdown", () => {
    expect(getGameSoundSequence("countdownTick")).toMatchObject({
      gain: 0.08,
      tones: [
        { frequency: 520, durationSeconds: 0.06, type: "square" },
        { frequency: 780, durationSeconds: 0.05, type: "square" },
      ],
    });
  });

  it("makes shield saves louder and lower than ordinary close calls", () => {
    const closeCall = getGameSoundSequence("closeCall");
    const shieldSave = getGameSoundSequence("shieldSave");

    expect(shieldSave.gain).toBeGreaterThan(closeCall.gain);
    expect(shieldSave.tones[0]?.frequency).toBeLessThan(closeCall.tones[0]?.frequency ?? 0);
  });

  it("does not create an audio context while sound is disabled", () => {
    const audioContextSpy = vi.fn();
    vi.stubGlobal("window", { AudioContext: audioContextSpy });

    setGameSoundEnabled(false);
    playGameSound("roundStart");

    expect(audioContextSpy).not.toHaveBeenCalled();
  });
});
