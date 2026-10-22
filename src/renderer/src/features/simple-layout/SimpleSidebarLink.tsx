import { Button } from "@openbot/ui";
import type { JSX } from "@solidjs/web";
import { Show } from "solid-js";

/** One link row of a simple sidebar list: an icon in a small card, the name, and a short note at the end. */
export function SimpleSidebarLink(props: {
  label: string;
  icon: JSX.Element;
  meta?: string | undefined;
  /** Read with the label, such as "6 upcoming". */
  metaLabel?: string | undefined;
  current?: boolean;
  onClick: (button: HTMLElement) => void;
}) {
  return (
    <Button
      variant="ghost"
      type="button"
      class="simple-sidebar-link"
      aria-label={props.metaLabel ? `${props.label}, ${props.metaLabel}` : props.label}
      aria-current={props.current ? "page" : undefined}
      data-cuelume-navigate=""
      onClick={(event) => props.onClick(event.currentTarget)}
    >
      <span class="simple-sidebar-link-icon" aria-hidden="true">
        {props.icon}
      </span>
      <span class="simple-sidebar-link-label">{props.label}</span>
      <Show when={props.meta}>
        {(meta) => (
          <span class="simple-sidebar-link-meta" aria-hidden="true">
            {meta()}
          </span>
        )}
      </Show>
    </Button>
  );
}
