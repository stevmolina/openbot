import { Puzzle } from "@openbot/ui";
import { createSignal, Show } from "solid-js";
import { type SkillArtworkSubject, skillArtwork } from "../marketplace/skill-artwork";

/** A skill's icon in a list. `skill` names the listing, so a first-party skill draws its own icon. */
export function SkillGlyph(props: { iconUrl: string | null; skill?: SkillArtworkSubject | undefined }) {
  const [failedUrl, setFailedUrl] = createSignal<string | null>(null);
  const iconUrl = () => (props.iconUrl && failedUrl() !== props.iconUrl ? props.iconUrl : null);
  const artwork = () => skillArtwork(props.skill);

  return (
    <span
      class="agent-skill-icon"
      data-skill-artwork={artwork() ? "" : undefined}
      style={artwork()?.style}
      aria-hidden="true"
    >
      <Show
        when={artwork()}
        keyed
        fallback={
          <Show when={iconUrl()} fallback={<Puzzle />} keyed>
            {(url) => <img src={url} alt="" onError={() => setFailedUrl(url)} />}
          </Show>
        }
      >
        {(art) => <art.Icon class="skill-artwork-glyph" />}
      </Show>
    </span>
  );
}
