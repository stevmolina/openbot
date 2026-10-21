import { createSignal } from "solid-js";

/**
 * The simple layout of this fork: the light theme, the sidebar bottom bar in place of the page rail,
 * and the tabbed agent panel. It is on unless the user turned it off. Off shows the upstream layout,
 * so the stylesheet keys every change on the two attributes that `applySimpleLayout` sets.
 *
 * Reading `window.localStorage` throws when the browser blocks storage, so it is read inside the guard.
 */
const SIMPLE_LAYOUT_STORAGE_KEY = "openbot:simple-layout-enabled";

function readSimpleLayout(): boolean {
  try {
    return window.localStorage.getItem(SIMPLE_LAYOUT_STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
}

const [simpleLayout, setSimpleLayoutSignal] = createSignal(readSimpleLayout());

function applySimpleLayout(enabled: boolean): void {
  const root = document.documentElement;
  if (enabled) {
    root.dataset.openbotTheme = "simple-light";
    root.dataset.openbotLayout = "simple";
  } else {
    delete root.dataset.openbotTheme;
    delete root.dataset.openbotLayout;
  }
}

/** Sets the attributes before the first render, so the dark theme does not flash. */
export function startSimpleLayout(): void {
  applySimpleLayout(simpleLayout());
}

/** Whether the simple layout is on. Components that change structure, not only style, read it. */
export { simpleLayout };

export function setSimpleLayout(enabled: boolean): void {
  try {
    window.localStorage.setItem(SIMPLE_LAYOUT_STORAGE_KEY, String(enabled));
  } catch {
    // Blocked or full storage keeps the choice for this page only.
  }
  setSimpleLayoutSignal(enabled);
  applySimpleLayout(enabled);
}
