import { useEffect } from "react";
import type { RefObject } from "react";

export function useOutsideAndEscape<T extends HTMLElement>(
  isOpen: boolean,
  ref: RefObject<T | null>,
  onClose: () => void
) {
  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node
        && ref.current
        && !ref.current.contains(event.target)
      ) {
        onClose();
      }
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose, ref]);
}
