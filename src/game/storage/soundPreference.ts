const storageKey = "poop-dodge-3d:sound-enabled";

export function readSoundEnabled(): boolean {
  try {
    return window.localStorage.getItem(storageKey) !== "off";
  } catch {
    return true;
  }
}

export function writeSoundEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(storageKey, enabled ? "on" : "off");
  } catch {
    // Gameplay should continue even if browser storage is unavailable.
  }
}
