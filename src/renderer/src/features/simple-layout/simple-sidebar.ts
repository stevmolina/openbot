import type { SidebarView } from "@openbot/ui/features/sidebar/sidebar-types";
import { createEffect, createMemo, createSignal } from "solid-js";
import { useLayout } from "../../layout";
import { simpleLayout } from "../../simple-layout";
import { useChannels } from "../channels/channels-context";
import { useSettings } from "../settings/settings-context";
import { useWindowPage } from "../window/window-page-context";

/**
 * The list of the sidebar in the simple layout, one per bottom bar button: the agents (chat), the
 * routines with Tasks and Schedule (clock), and the Marketplace with the connections (plug).
 */
export type SimpleSidebarList = "chat" | "clock" | "plug";

/** The bottom bar button that shows as current. The photo is current while a page of its menu shows. */
export type SimpleBarButton = SimpleSidebarList | "photo";

/**
 * The state of the simple sidebar. The list follows the page in the card, as the rail buttons did:
 * the Marketplace shows the plug list, and Tasks, Schedule and the Routines view show the clock list.
 * The usage and settings pages keep the list that showed before them.
 */
export function createSimpleSidebar() {
  const windowPage = useWindowPage();
  const layout = useLayout();
  const channels = useChannels();
  const { setSkillsMarketplaceOpen } = useSettings();

  const pageList = (): SimpleSidebarList | null => {
    const page = windowPage.page();
    if (page === "marketplace") return "plug";
    if (page === "tasks" || page === "schedule") return "clock";
    if (page === "agents") return layout.sidebarView() === "routines" ? "clock" : "chat";
    return null;
  };
  const [heldList, setHeldList] = createSignal<SimpleSidebarList>("chat");
  createEffect(pageList, (next) => {
    if (next) setHeldList(next);
  });
  const list = createMemo(() => pageList() ?? heldList());

  // The clock list holds the routines, so Tasks or Schedule opened from search shows the Routines view.
  // An open channel has no row in that view, and the sidebar puts the agents view back while a channel
  // is selected, so the channel closes here (as it does for the Routines button). Without this the two
  // effects flip the view forever.
  createEffect(
    () => simpleLayout() && list() === "clock" && layout.sidebarView() === "agents",
    (needsRoutines) => {
      if (!needsRoutines) return;
      if (channels.state.selectedId !== null) channels.close();
      layout.setSidebarView("routines");
    },
  );

  const current = (): SimpleBarButton => {
    const page = windowPage.page();
    return page === "usage" || page === "settings" || page === "server-settings" ? "photo" : list();
  };

  /** Agents and Routines show the agents page; they set the list of the sidebar, as the rail did. */
  function showSidebarView(view: SidebarView): void {
    windowPage.showAgents();
    // An open channel would stay in the middle with no row in the list.
    if (view === "routines") channels.close();
    layout.setSidebarView(view);
  }

  return {
    list,
    current,
    /** Whether a page other than the agents covers the chat, so no row of the list is open. */
    pageOpen: () => windowPage.page() !== "agents",
    showChat: () => showSidebarView("agents"),
    showClock: () => showSidebarView("routines"),
    showPlug: () => setSkillsMarketplaceOpen(true),
    showRoutines: () => showSidebarView("routines"),
  };
}

export type SimpleSidebar = ReturnType<typeof createSimpleSidebar>;
