import { APP_LOGO_EYE_POINTS, APP_LOGO_SIZE } from "@openbot/brand/app-logo-shape";
import type { JSX } from "@solidjs/web";
import { createMemo } from "solid-js";
import { cx } from "./utils";

export interface ServerGradientLogoProfile {
  /** Four seeded corner radii, as a CSS `border-radius` value. Each server gets its own soft blob. */
  corners: string;
}

export interface ServerGradientLogoProps {
  seed: string;
  /** The body color. Absent, the body takes the OpenBot logo color, the mascot's own color. */
  color?: string | null;
  class?: JSX.HTMLAttributes<HTMLSpanElement>["class"];
}

/**
 * The default server logo: the OpenBot mascot face (two eyes) on a soft rounded body. The eyes are
 * the same strokes `AppLogo` draws. The corners vary by seed, so servers without a logo still look
 * different from each other. A server logo image replaces this drawing; it never reaches here.
 */
export function serverGradientLogoProfile(seed: string): ServerGradientLogoProfile {
  const stableSeed = seed || "server";
  const corner = (name: string) => seededRange(`${stableSeed}:corner:${name}`, 16, 30);
  return {
    corners: `${corner("tl")}% ${corner("tr")}% ${corner("br")}% ${corner("bl")}% / ${corner("tl-y")}% ${corner("tr-y")}% ${corner("br-y")}% ${corner("bl-y")}%`,
  };
}

export function ServerGradientLogo(props: ServerGradientLogoProps): JSX.Element {
  const profile = createMemo(() => serverGradientLogoProfile(props.seed));

  return (
    <span
      class={cx("ui-server-gradient-logo", props.class)}
      style={{
        "--server-logo-color": props.color || "var(--openbot-logo-production)",
        "--server-logo-corners": profile().corners,
      }}
      aria-hidden="true"
    >
      <svg class="ui-server-gradient-logo-face" viewBox={`0 0 ${APP_LOGO_SIZE} ${APP_LOGO_SIZE}`} aria-hidden="true">
        <polyline class="ui-server-gradient-logo-eye" points={APP_LOGO_EYE_POINTS.left} />
        <polyline class="ui-server-gradient-logo-eye" points={APP_LOGO_EYE_POINTS.right} />
      </svg>
    </span>
  );
}

function stableHash(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function seededRange(seed: string, minimum: number, maximum: number): number {
  return minimum + (stableHash(seed) % (maximum - minimum + 1));
}
