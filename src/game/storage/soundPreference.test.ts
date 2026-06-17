import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readSoundEnabled, writeSoundEnabled } from "./soundPreference";

type FakeStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

function installStorage(storage: FakeStorage): void {
  vi.stubGlobal("window", { localStorage: storage });
}

describe("sound preference storage", () => {
  const values = new Map<string, string>();

  beforeEach(() => {
    values.clear();
    installStorage({
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => {
        values.set(key, value);
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("defaults sound to enabled", () => {
    expect(readSoundEnabled()).toBe(true);
  });

  it("persists disabled and enabled states", () => {
    writeSoundEnabled(false);
    expect(readSoundEnabled()).toBe(false);

    writeSoundEnabled(true);
    expect(readSoundEnabled()).toBe(true);
  });

  it("keeps gameplay enabled when storage reads fail", () => {
    installStorage({
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => undefined,
    });

    expect(readSoundEnabled()).toBe(true);
  });
});
