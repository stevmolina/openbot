import { Button, ChevronRight, IconButton, SlidingTabs, Text, Upload, X } from "@openbot/ui";
import type { JSX } from "@solidjs/web";
import { For, Show } from "solid-js";
import { useText } from "../../text";

/** One routine of the agent, as the Routines card lists it: its name, and when it runs next. */
export interface SimpleAgentRoutineRow {
  id: string;
  name: string;
  /** The next run, such as "Fri 9:00 AM", or the schedule when no run is planned soon. */
  when: string;
}

/**
 * What the application gives the simple agent panel. The shared panel owns the agent's own fields;
 * the application owns the rows that open its dialogs, its routines and its browser. The rows of
 * "More settings" come through the panel's `links`, as they do in the default layout.
 */
export interface SimpleAgentPanelSlots {
  /** The Library tab: memories, skills, files and tables. */
  library: () => JSX.Element;
  /** The application part of the Computer tab, such as the browser row. */
  computer: () => JSX.Element;
  /** Null hides the Routines card: the host cannot list routines here. */
  routines: readonly SimpleAgentRoutineRow[] | null;
  onOpenRoutine: (routineId: string) => void;
  /** Opens the routine settings, where a new routine is made. */
  onManageRoutines: () => void;
  /** The share button at the top. Left out when the agent cannot be published. */
  onShare?: (() => void) | undefined;
}

export type SimpleAgentTab = "details" | "library" | "computer";

/** Share and close, the two round buttons at the top right. The face editor comes after them. */
export function SimpleAgentPanelActions(props: { onShare?: (() => void) | undefined; onClose: () => void }) {
  const { t } = useText();
  return (
    <div class="simple-agent-panel-actions">
      <Show when={props.onShare}>
        {(share) => (
          <IconButton
            variant="outline"
            class="simple-agent-panel-round"
            label={t("conversation.header.publish")}
            onClick={() => share()()}
          >
            <Upload aria-hidden="true" />
          </IconButton>
        )}
      </Show>
      <IconButton
        variant="outline"
        class="simple-agent-panel-round"
        label={t("agentSettings.closeDetails")}
        onClick={() => props.onClose()}
      >
        <X aria-hidden="true" />
      </IconButton>
    </div>
  );
}

interface SimpleAgentPanelProps {
  slots: SimpleAgentPanelSlots;
  tab: SimpleAgentTab;
  onTabChange: (tab: SimpleAgentTab) => void;
  /** The name and title fields. They look like text until they have focus. */
  name: JSX.Element;
  title: JSX.Element;
  model: string;
  effort: string;
  /** The Computer Use switch of the agent, when this host can change it. */
  computerUse?: JSX.Element;
  onOpenRuntime: () => void;
  onOpenMore: () => void;
  /** Ref callbacks of the two page rows, so Back from their pages returns the focus to them. */
  runtimeRef?: ((element: HTMLButtonElement) => void) | undefined;
  moreRef?: ((element: HTMLButtonElement) => void) | undefined;
}

/** The agent panel of the simple layout under the face: the name, then Details, Library and Computer. */
export function SimpleAgentPanel(props: SimpleAgentPanelProps): JSX.Element {
  const { t } = useText();
  return (
    <div class="simple-agent-panel">
      <div class="simple-agent-panel-hero">
        <div class="simple-agent-panel-name">{props.name}</div>
        <div class="simple-agent-panel-title">{props.title}</div>
      </div>
      <SlidingTabs.Root
        class="simple-agent-panel-tabs"
        value={props.tab}
        onChange={(value) => {
          if (value === "details" || value === "library" || value === "computer") props.onTabChange(value);
        }}
      >
        <SlidingTabs.List class="simple-agent-panel-tab-list" aria-label={t("simple.agentPanel.tabs")}>
          <SlidingTabs.Trigger value="details">{t("simple.agentPanel.tab.details")}</SlidingTabs.Trigger>
          <SlidingTabs.Trigger value="library">{t("simple.agentPanel.tab.library")}</SlidingTabs.Trigger>
          <SlidingTabs.Trigger value="computer">{t("simple.agentPanel.tab.computer")}</SlidingTabs.Trigger>
        </SlidingTabs.List>
        <SlidingTabs.ContentSlot>
          <SlidingTabs.Content value="details" class="simple-agent-panel-tab">
            <SimpleSection label={t("simple.agentPanel.runsOn")}>
              <div class="simple-agent-card">
                <Button
                  ref={props.runtimeRef}
                  variant="ghost"
                  type="button"
                  class="simple-agent-card-row"
                  aria-label={t("simple.agentPanel.runsOnLabel", { model: props.model, effort: props.effort })}
                  onClick={() => props.onOpenRuntime()}
                >
                  <span class="simple-agent-card-row-main">{props.model}</span>
                  <span class="simple-agent-card-row-side">
                    {props.effort}
                    <ChevronRight aria-hidden="true" />
                  </span>
                </Button>
              </div>
            </SimpleSection>
            <Show when={props.slots.routines}>
              {(routines) => (
                <SimpleSection
                  label={t("agentSettings.links.routines")}
                  action={
                    <Button
                      variant="ghost"
                      type="button"
                      class="simple-agent-section-link"
                      onClick={() => props.slots.onManageRoutines()}
                    >
                      {t("simple.agentPanel.routines.manage")}
                    </Button>
                  }
                >
                  <Show
                    when={routines().length > 0}
                    fallback={
                      <Text as="p" variant="caption" tone="muted" class="simple-agent-empty">
                        {t("simple.agentPanel.routines.empty")}
                      </Text>
                    }
                  >
                    <div class="simple-agent-card">
                      <For each={routines()}>
                        {(routine) => (
                          <Button
                            variant="ghost"
                            type="button"
                            class="simple-agent-card-row"
                            onClick={() => props.slots.onOpenRoutine(routine.id)}
                          >
                            <span class="simple-agent-card-row-main">{routine.name}</span>
                            <span class="simple-agent-card-row-side">{routine.when}</span>
                          </Button>
                        )}
                      </For>
                    </div>
                  </Show>
                </SimpleSection>
              )}
            </Show>
            <Button
              ref={props.moreRef}
              variant="ghost"
              type="button"
              class="simple-agent-more"
              onClick={() => props.onOpenMore()}
            >
              {t("simple.agentPanel.more")}
            </Button>
          </SlidingTabs.Content>
          <SlidingTabs.Content value="library" class="simple-agent-panel-tab">
            {props.slots.library()}
          </SlidingTabs.Content>
          <SlidingTabs.Content value="computer" class="simple-agent-panel-tab">
            {props.slots.computer()}
            {props.computerUse}
          </SlidingTabs.Content>
        </SlidingTabs.ContentSlot>
      </SlidingTabs.Root>
    </div>
  );
}

/** A small muted label above a card, with an optional link on its right. */
function SimpleSection(props: { label: string; action?: JSX.Element; children: JSX.Element }): JSX.Element {
  return (
    <section class="simple-agent-section">
      <div class="simple-agent-section-label">
        <span>{props.label}</span>
        {props.action}
      </div>
      {props.children}
    </section>
  );
}
