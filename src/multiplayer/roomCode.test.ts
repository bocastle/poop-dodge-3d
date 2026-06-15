import { describe, expect, it, vi } from "vitest";
import { createRoomCode, isValidRoomCode, normalizeRoomCode } from "./roomCode";

describe("room code helpers", () => {
  it("validates exactly four digits", () => {
    expect(isValidRoomCode("1234")).toBe(true);
    expect(isValidRoomCode("123")).toBe(false);
    expect(isValidRoomCode("12345")).toBe(false);
    expect(isValidRoomCode("12a4")).toBe(false);
  });

  it("normalizes non-digit input to four digits", () => {
    expect(normalizeRoomCode("ab12-34cd56")).toBe("1234");
  });

  it("creates a padded numeric code", () => {
    expect(createRoomCode(new Set(), () => 0.0042)).toBe("0042");
  });

  it("retries when a generated code already exists", () => {
    const randomValues = [0, 0.1234];
    const code = createRoomCode(new Set(["0000"]), () => randomValues.shift() ?? 0);

    expect(code).toBe("1234");
    expect(randomValues).toHaveLength(0);
  });

  it("returns null after repeated collisions", () => {
    const random = vi.fn(() => 0);

    expect(createRoomCode(new Set(["0000"]), random)).toBeNull();
    expect(random).toHaveBeenCalledTimes(100);
  });

  it("keeps generated codes valid when injected random values are outside the expected range", () => {
    const badRandomValues = [
      Number.NaN,
      Number.NEGATIVE_INFINITY,
      Number.POSITIVE_INFINITY,
      -0.25,
      2,
    ];

    for (const randomValue of badRandomValues) {
      const code = createRoomCode(new Set(), () => randomValue);
      expect(code).not.toBeNull();
      expect(isValidRoomCode(code ?? "")).toBe(true);
    }
  });
});
