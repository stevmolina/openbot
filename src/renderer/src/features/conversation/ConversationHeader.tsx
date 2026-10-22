import type { AgentModelId, AgentReasoningEffort } from "@openbot/contracts/ipc";
import { isAgentTaskActive } from "@openbot/team-client/agent-tasks";
import { reasoningLabel } from "@openbot/ui/components/ProviderModelPicker";
import { ConversationHeader as SharedConversationHeader } from "@openbot/ui/features/conversation/ConversationHeader";
import { simpleLayout } from "../../simple-layout";
import { useConversationModelPicker } from "./conversation-model-picker";
import { useConversationViewScope } from "./conversation-scope";

const loadAgentSettingsPanel = () => import("./AgentSettingsPanel");

import { useText } from "@openbot/ui/text";

/** @internal Stable HMR boundary for conversation header. */
export function ConversationHeader() {
  const { t } = useText();
  const {
    actingBrowserControl,
    agentActivity,
    browserControlAgent,
    props,
    runningTurnRuntime,
    setActiveRightPanel,
    settingsModel,
    settingsProvider,
    settingsReasoning,
    sidePanelOpen,
    toggleSidePanel,
  } = useConversationViewScope();
  const modelPicker = useConversationModelPicker();
  const runningTasks = () => props.tasks?.snapshot?.tasks.filter(isAgentTaskActive).length ?? 0;
  const working = () => agentActivity() === "Working";
  /** The effort shows only where it differs, so a model change alone names only the models. */
  const runtimeLabel = (model: AgentModelId, effort: AgentReasoningEffort, otherEffort: AgentReasoningEffort) => {
    const name =
      props.modelOptions.find((option) => option.provider === settingsProvider() && option.id === model)?.name ?? model;
    return effort === otherEffort ? name : `${name} · ${reasoningLabel(effort, t)}`;
  };
  const pendingModel = () => {
    const running = runningTurnRuntime();
    if (!working() || !running) return undefined;
    const model = settingsModel();
    const effort = settingsReasoning();
    if (model === running.model && effort === running.reasoningEffort) return undefined;
    return {
      running: runtimeLabel(running.model, running.reasoningEffort, effort),
      next: runtimeLabel(model, effort, running.reasoningEffort),
    };
  };
  return (
    <SharedConversationHeader
      agent={props.agent}
      onSettingsIntent={() => void loadAgentSettingsPanel()}
      onOpenSettings={() => {
        // In the simple layout the name pill is the side panel button: it opens the agent panel, or closes the panel.
        if (simpleLayout() && sidePanelOpen()) toggleSidePanel();
        else setActiveRightPanel("settings");
      }}
      titleControlsSidePanel={simpleLayout()}
      pendingModel={pendingModel()}
      modelPicker={modelPicker()}
      remoteControl={
        props.remoteDesktopEnabled !== false && props.server?.kind === "remote"
          ? {
              enabled: Boolean(props.remoteDesktopSessionActive || props.server.state === "online"),
              active: Boolean(props.remoteDesktopSessionActive),
              visible: Boolean(props.remoteDesktopVisible),
              onOpen: (trigger) => {
                if (props.server) void props.onOpenRemoteDesktop(props.server.id, trigger);
              },
            }
          : undefined
      }
      sidePanel={{
        open: sidePanelOpen(),
        actingAgentName: actingBrowserControl()
          ? (browserControlAgent()?.name ?? t("conversation.header.agentFallback"))
          : undefined,
        running: runningTasks(),
        onToggle: toggleSidePanel,
      }}
    />
  );
}
