import { useEffect, useState } from "react";
import type { InputVector } from "../types";
import { normalizeInput } from "../logic";

const pressed = new Set<string>();

export function useKeyboardControls(enabled: boolean): InputVector {
  const [input, setInput] = useState<InputVector>({ x: 0, z: 0 });

  useEffect(() => {
    if (!enabled) {
      pressed.clear();
      setInput({ x: 0, z: 0 });
      return;
    }

    const applyInput = () => {
      const x = Number(pressed.has("arrowright") || pressed.has("d")) -
        Number(pressed.has("arrowleft") || pressed.has("a"));
      const z = Number(pressed.has("arrowdown") || pressed.has("s")) -
        Number(pressed.has("arrowup") || pressed.has("w"));
      setInput(normalizeInput({ x, z }));
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (isMovementKey(key)) {
        event.preventDefault();
        pressed.add(key);
        applyInput();
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (isMovementKey(key)) {
        event.preventDefault();
        pressed.delete(key);
        applyInput();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      pressed.clear();
    };
  }, [enabled]);

  return input;
}

function isMovementKey(key: string) {
  return ["arrowleft", "arrowright", "arrowup", "arrowdown", "w", "a", "s", "d"].includes(key);
}
