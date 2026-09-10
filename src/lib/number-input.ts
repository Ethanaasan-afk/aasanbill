import type { ChangeEvent, FocusEvent, MouseEvent } from "react";

type FocusHandler = (e: FocusEvent<HTMLInputElement>) => void;
type ChangeHandler = (e: ChangeEvent<HTMLInputElement>) => void;
type MouseHandler = (e: MouseEvent<HTMLInputElement>) => void;

/**
 * Shared behavior for type="number" fields:
 * - select-all on focus so typing replaces "0" instead of becoming "05"
 * - optionally restore empty → "0" on blur for legacy fields
 *
 * Spread onto an <input type="number"> (or used by the shared Input component).
 */
export function getNumberInputHandlers({
  onFocus,
  onBlur,
  onChange,
  onMouseUp,
  emptyAsZero = false,
}: {
  onFocus?: FocusHandler;
  onBlur?: FocusHandler;
  onChange?: ChangeHandler;
  onMouseUp?: MouseHandler;
  emptyAsZero?: boolean;
} = {}) {
  return {
    onChange,
    onFocus: (e: FocusEvent<HTMLInputElement>) => {
      const el = e.currentTarget;
      el.dataset.numberSelect = "1";
      // Defer so the following mouseup does not clear the selection
      requestAnimationFrame(() => {
        try {
          el.select();
        } catch {
          /* ignore */
        }
      });
      onFocus?.(e);
    },
    onMouseUp: (e: MouseEvent<HTMLInputElement>) => {
      // Only block the mouseup right after focus (keeps select-all).
      // Later clicks can place the caret normally.
      if (e.currentTarget.dataset.numberSelect === "1") {
        e.preventDefault();
        delete e.currentTarget.dataset.numberSelect;
      }
      onMouseUp?.(e);
    },
    onBlur: (e: FocusEvent<HTMLInputElement>) => {
      delete e.currentTarget.dataset.numberSelect;
      if (emptyAsZero && e.currentTarget.value.trim() === "") {
        e.currentTarget.value = "0";
        onChange?.({
          ...e,
          target: e.currentTarget,
          currentTarget: e.currentTarget,
        } as ChangeEvent<HTMLInputElement>);
      }
      onBlur?.(e);
    },
  };
}
