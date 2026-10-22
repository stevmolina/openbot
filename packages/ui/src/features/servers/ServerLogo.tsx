import { createEffect, createSignal, Show } from "solid-js";
import { ServerGradientLogo } from "../../server-gradient-logo";

/** A server logo image, or the default OpenBot mascot logo when there is no image or it does not load. */
export function ServerLogo(props: { name: string; seed?: string; url: string | null }) {
  const [failed, setFailed] = createSignal(false);
  createEffect(
    () => props.url,
    () => {
      setFailed(false);
    },
  );
  return (
    <span class="server-settings-logo" aria-hidden="true">
      <Show
        when={!failed() ? props.url : null}
        fallback={<ServerGradientLogo class="server-settings-logo-default" seed={props.seed ?? props.name} />}
      >
        {(url) => <img src={url()} alt="" draggable={false} onError={() => setFailed(true)} />}
      </Show>
    </span>
  );
}
