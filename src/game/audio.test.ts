import { describe, expect, it } from "vitest";
import { getGameSoundSequence } from "./audio";

describe("game audio recipes", () => {
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
});
