import { useCallback, useMemo, useRef, useState } from "react";
import type { PointerEvent } from "react";
import type { InputVector } from "../types";
import { normalizeInput } from "../logic";

type TouchState = {
  active: boolean;
  input: InputVector;
  handlers: {
    onPointerDown: (event: PointerEvent<HTMLElement>) => void;
    onPointerMove: (event: PointerEvent<HTMLElement>) => void;
    onPointerUp: (event: PointerEvent<HTMLElement>) => void;
    onPointerCancel: (event: PointerEvent<HTMLElement>) => void;
  };
};

export function useTouchControls(enabled: boolean): TouchState {
  const start = useRef({ x: 0, y: 0 });
  const pointerId = useRef<number | null>(null);
  const [active, setActive] = useState(false);
  const [input, setInput] = useState<InputVector>({ x: 0, z: 0 });

  const reset = useCallback((event?: PointerEvent<HTMLElement>) => {
    if (event && pointerId.current !== event.pointerId) {
      return;
    }
    pointerId.current = null;
    setActive(false);
    setInput({ x: 0, z: 0 });
  }, []);

  const updateInput = useCallback((clientX: number, clientY: number) => {
    const maxDistance = 92;
    setInput(
      normalizeInput({
        x: (clientX - start.current.x) / maxDistance,
        z: (clientY - start.current.y) / maxDistance,
      })
    );
  }, []);

  const handlers = useMemo(
    () => ({
      onPointerDown: (event: PointerEvent<HTMLElement>) => {
        if (!enabled || event.pointerType === "mouse") {
          return;
        }
        pointerId.current = event.pointerId;
        start.current = { x: event.clientX, y: event.clientY };
        event.currentTarget.setPointerCapture(event.pointerId);
        setActive(true);
        updateInput(event.clientX, event.clientY);
      },
      onPointerMove: (event: PointerEvent<HTMLElement>) => {
        if (!enabled || pointerId.current !== event.pointerId) {
          return;
        }
        updateInput(event.clientX, event.clientY);
      },
      onPointerUp: reset,
      onPointerCancel: reset,
    }),
    [enabled, reset, updateInput]
  );

  return { active, input, handlers };
}
