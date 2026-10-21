import { Show } from "solid-js";
import { SidebarDialogs } from "./SidebarDialogs";
import { SidebarFrame } from "./SidebarFrame";
import { SidebarNav } from "./SidebarNav";
import { SidebarSearch } from "./SidebarSearch";
import { SidebarTopbar } from "./SidebarTopbar";
import { SidebarViewSwitch } from "./SidebarViewSwitch";
import { createSidebarScope, SidebarScopeContext } from "./sidebar-scope";
import type { SidebarProps } from "./sidebar-types";

export function Sidebar(props: SidebarProps) {
  const scope = createSidebarScope(props);
  return (
    <SidebarScopeContext value={scope}>
      <SidebarFrame compact={props.compact}>
        <SidebarTopbar />

        {/* The compact sidebar has no room for the top row button, so it keeps its own search button. */}
        <Show when={!props.searchButton || props.compact}>
          <SidebarSearch />
        </Show>

        <Show when={props.onViewChange && !props.compact}>
          <SidebarViewSwitch />
        </Show>

        {props.listStart}

        <Show when={!props.list} fallback={props.list}>
          <SidebarNav />
        </Show>

        <Show when={!props.compact}>{props.footer}</Show>

        {props.bottomBar}

        <SidebarDialogs />
      </SidebarFrame>
    </SidebarScopeContext>
  );
}
