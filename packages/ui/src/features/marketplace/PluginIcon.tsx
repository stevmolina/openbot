import { Blocks, Puzzle } from "@openbot/ui";
import { createMemo, createSignal, Show } from "solid-js";
import { type SkillArtworkSubject, skillArtwork } from "./skill-artwork";

/**
 * A listing's icon, or a plugin or skill mark when it has none or it does not load. A first-party
 * skill passes `skill` and draws its own line icon instead of the image.
 */
export function PluginIcon(props: {
  iconUrl: string | null;
  fallback?: "plugin" | "skill";
  class?: string;
  skill?: SkillArtworkSubject | undefined;
}) {
  const [failedUrl, setFailedUrl] = createSignal<string | null>(null);
  const iconUrl = createMemo(() => {
    const url = props.iconUrl;
    return url && failedUrl() !== url ? url : null;
  });
  const artwork = () => skillArtwork(props.skill);
  return (
    <span
      class={props.class ? `skills-marketplace-icon ${props.class}` : "skills-marketplace-icon"}
      data-skill-artwork={artwork() ? "" : undefined}
      style={artwork()?.style}
    >
      <Show
        when={artwork()}
        keyed
        fallback={
          <Show when={iconUrl()} fallback={props.fallback === "skill" ? <Blocks /> : <Puzzle />} keyed>
            {(url) => <img src={url} alt="" onError={() => setFailedUrl(url)} />}
          </Show>
        }
      >
        {(art) => <art.Icon class="skill-artwork-glyph" />}
      </Show>
    </span>
  );
}
