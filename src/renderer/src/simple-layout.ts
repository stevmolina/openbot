import { createSignal } from "solid-js";

/**
 * The simple layout of this fork: the light theme, the sidebar bottom bar in place of the page rail,
 * and the tabbed agent panel. It exists only on the desktop renderer: `startSimpleLayout`, which only
 * the desktop entry calls, reads the saved choice (on unless the user turned it off). The web client and
 * the landing playground import the same components but never call it, so they keep the upstream layout.
 * Off shows the upstream layout, so the stylesheet keys every change on the two attributes that
 * `applySimpleLayout` sets.
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

const [simpleLayout, setSimpleLayoutSignal] = createSignal(false);
const [simpleLayoutSupported, setSimpleLayoutSupported] = createSignal(false);

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
  setSimpleLayoutSupported(true);
  // The attributes use the value read here: a signal write is not visible to a read in the same tick.
  const enabled = readSimpleLayout();
  setSimpleLayoutSignal(enabled);
  applySimpleLayout(enabled);
}

/**
 * `simpleLayout`: whether the simple layout is on. Components that change structure, not only style, read it.
 * `simpleLayoutSupported`: whether this renderer offers it, true after `startSimpleLayout` ran (desktop only).
 */
export { simpleLayout, simpleLayoutSupported };

export function setSimpleLayout(enabled: boolean): void {
  try {
    window.localStorage.setItem(SIMPLE_LAYOUT_STORAGE_KEY, String(enabled));
  } catch {
    // Blocked or full storage keeps the choice for this page only.
  }
  setSimpleLayoutSignal(enabled);
  applySimpleLayout(enabled);
}
