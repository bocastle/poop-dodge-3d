import { ROOM_CODE_LENGTH } from "./types";

const codePattern = new RegExp(`^\\d{${ROOM_CODE_LENGTH}}$`);

function normalizeRandomValue(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(Math.max(value, 0), 0.9999);
}

export function isValidRoomCode(value: string): boolean {
  return codePattern.test(value);
}

export function normalizeRoomCode(value: string): string {
  return value.replace(/\D/g, "").slice(0, ROOM_CODE_LENGTH);
}

export function createRoomCode(
  existingCodes: ReadonlySet<string>,
  random = Math.random
): string | null {
  for (let attempts = 0; attempts < 100; attempts += 1) {
    const code = Math.floor(normalizeRandomValue(random()) * 10000)
      .toString()
      .padStart(ROOM_CODE_LENGTH, "0");
    if (!existingCodes.has(code)) {
      return code;
    }
  }

  return null;
}
