const storageKey = "poop-dodge-3d:high-score";

export function readHighScore() {
  try {
    const value = window.localStorage.getItem(storageKey);
    return value ? Number.parseInt(value, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

export function writeHighScore(score: number) {
  try {
    window.localStorage.setItem(storageKey, String(Math.max(0, Math.floor(score))));
  } catch {
    // Gameplay should continue even if browser storage is unavailable.
  }
}
