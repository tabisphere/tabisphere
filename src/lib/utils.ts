import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function focusEndContentEditable(element: HTMLElement) {
  element?.focus();

  if (
    typeof window.getSelection != "undefined" &&
    typeof document.createRange != "undefined"
  ) {
    const range = document.createRange();
    range.selectNodeContents(element!);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }
}

export function trimEnd(mainString: string, stringToTrim: string): string {
  if (mainString.endsWith(stringToTrim)) {
    return mainString.slice(0, mainString.length - stringToTrim.length);
  }
  return mainString;
}
