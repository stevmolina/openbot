import { foreignProvider } from "@openbot/contracts/agent-providers";
import type { ProviderModelPickerProps } from "@openbot/ui/components/ProviderModelPicker";
import { useText } from "@openbot/ui/text";
import { useConversationViewScope } from "./conversation-scope";
import { recentModels } from "./recent-models";

/**
 * The model picker of the open chat. The header shows it in the upstream layout and the composer in
 * the simple layout; both call the same operations, so a switch behaves the same from either place.
 */
export function useConversationModelPicker(): () => ProviderModelPickerProps {
  const { t } = useText();
  const {
    agentActivity,
    changeFastMode,
    fastMode,
    props,
    selectAndConfirmModel,
    selectAndConfirmReasoning,
    settingsModel,
    settingsProvider,
    settingsReasoning,
  } = useConversationViewScope();
  const working = () => agentActivity() === "Working";
  return () => ({
    provider: settingsProvider(),
    foreignProvider: props.agent ? foreignProvider(props.agent.provider) : undefined,
    value: settingsModel(),
    reasoningEffort: settingsReasoning(),
    modelOptions: props.modelOptions,
    agentStatus: props.agentStatus,
    runtimeStatuses: props.providerRuntimeStatuses,
    customProviders: props.customProviders,
    customAgents: props.customAgents,
    onDownloadProvider: props.onDownloadProvider,
    onCancelProviderDownload: props.onCancelProviderDownload,
    onConnectProvider: props.onConnectProvider,
    canConnectProvider: props.canConnectProvider,
    onManageProviders: props.onManageProviders,
    // A model or effort chosen during a turn applies from the next turn. A provider change waits.
    providerChangesDisabled: working(),
    disabledReason: working() ? t("conversation.header.providerBusy") : t("conversation.header.modelsUnavailable"),
    accountChoice: true,
    providerAccountId: props.agent?.providerAccountId,
    recentModels: recentModels(),
    onChange: (model, provider, accountId) => void selectAndConfirmModel(model, provider, accountId),
    onReasoningEffortChange: (effort) => void selectAndConfirmReasoning(effort),
    // Codex only for now, and only on this computer: the Team API does not carry fast mode.
    fastMode: fastMode(),
    onFastModeChange:
      settingsProvider() === "codex" && props.server?.kind === "local"
        ? (next) => void changeFastMode(next)
        : undefined,
  });
}
