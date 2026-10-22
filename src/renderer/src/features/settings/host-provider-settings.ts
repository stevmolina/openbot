import type { ServerSummary } from "@openbot/contracts/ipc";
import { isAgentAccount } from "@openbot/ui/components/provider-accounts";
import type { AcpRegistrySettingsApi } from "@openbot/ui/features/custom-providers/AcpRegistrySettings";
import type { CustomAgentSettingsApi } from "@openbot/ui/features/custom-providers/CustomAgentSettings";
import { providerDiagnosticsText } from "@openbot/ui/features/provider-diagnostics/provider-diagnostics";
import { appPort } from "../../app-port";
import { useProviders } from "../../providers";
import { useAgents } from "../agents/agents-context";
import { useCustomAgents } from "../custom-agents/custom-agents-context";
import { useCustomProviders } from "../custom-providers/custom-providers-context";
import { useProviderDetection } from "../custom-providers/provider-detection-context";
import { useSetup } from "../onboarding/onboarding-context";
import { serverCanAdminister } from "../servers/server-capabilities";
import { usePlanLimitRows } from "../usage/plan-limit-rows";
import type { HostProviderSettings } from "./ProviderSettingsSection";

/**
 * The providers of a server, as the Providers section of its settings and a provider page of the
 * Apps area take them. It reads the contexts once, so call it in a component body.
 */
export function useHostProviderSettings(): (server: ServerSummary) => HostProviderSettings | undefined {
  const usageRows = usePlanLimitRows();
  const { agentList, agentStatus } = useAgents();
  const { setupState, saveSetup } = useSetup();
  const {
    providerAdminServerId,
    providerRuntimeStatuses,
    providerAvailableVersions,
    providerRuntimeDownloadsAvailable,
    downloadProviderRuntime,
    startProviderUpdate,
    cancelProviderRuntimeDownload,
    cancelProviderSignIn,
    openProviderInstallGuide,
    setProviderOn,
    providerAccounts,
    restartProvider,
    cancelProviderRestart,
    connection,
    providerKeys,
    hostCustomProviders,
  } = useProviders();
  const localEndpoints = useCustomProviders();
  const localAgents = useCustomAgents();
  const detection = useProviderDetection();
  /** A custom agent is a command on this computer, so only the local server lists or runs one. */
  const customAgents: CustomAgentSettingsApi = {
    get agents() {
      return localAgents.customAgents();
    },
    save: localAgents.saveCustomAgent,
    remove: localAgents.deleteCustomAgent,
    check: localAgents.checkCustomAgent,
    // One process group runs every custom agent, so its restart is the restart of all of them.
    get restartPending() {
      return agentStatus().providers?.some((provider) => provider.id === "acp" && provider.restartPending) === true;
    },
    get lastError() {
      return agentStatus().providers?.find((provider) => provider.id === "acp")?.lastError;
    },
    get diagnostics() {
      const status = agentStatus().providers?.find((provider) => provider.id === "acp");
      return status ? providerDiagnosticsText(status) : undefined;
    },
    restart: () => restartProvider("acp"),
    cancelRestart: () => cancelProviderRestart("acp"),
  };
  /**
   * The providers of the computer the agents of `server` run on: this one, or the host of a joined
   * server that the account administers over `providers-v1`. The provider state belongs to the
   * selected server only, so it is read only while `server` is the selected one.
   */
  const registryApis = new Map<string, AcpRegistrySettingsApi>();
  function registryFor(server: ServerSummary): AcpRegistrySettingsApi {
    const existing = registryApis.get(server.id);
    if (existing) return existing;
    const api: AcpRegistrySettingsApi = {
      search: (query) => appPort().acpRegistry.search(query, server.id),
      status: () => appPort().acpRegistry.status(server.id),
      install: async (input) => {
        const result = await appPort().acpRegistry.install(input, server.id);
        if (server.kind === "local") await localAgents.refreshCustomAgents();
        return result;
      },
      cancel: (id) => appPort().acpRegistry.cancel(id, server.id),
      remove: (id) => appPort().acpRegistry.remove(id, server.id),
    };
    registryApis.set(server.id, api);
    return api;
  }
  const providerSettings = (server: ServerSummary): HostProviderSettings | undefined => {
    const local = server.kind === "local";
    if (!server.active || (!local && server.id !== providerAdminServerId())) return undefined;
    /**
     * A named endpoint merges into the `opencode acp` process of that computer. This does not need
     * `providerRuntimeDownloadsAvailable()`: a build without managed runtime downloads still has custom endpoints.
     */
    const endpoints = local ? localEndpoints : hostCustomProviders;
    return {
      get defaultProvider() {
        const state = setupState();
        return local && state ? { ...state, save: saveSetup } : undefined;
      },
      get agentStatus() {
        return agentStatus();
      },
      get providerRuntimeStatuses() {
        return providerRuntimeDownloadsAvailable() ? providerRuntimeStatuses() : undefined;
      },
      get providerAvailableVersions() {
        return providerRuntimeDownloadsAvailable() ? providerAvailableVersions() : undefined;
      },
      get onUpdateProvider() {
        return providerRuntimeDownloadsAvailable() ? startProviderUpdate : undefined;
      },
      get onDownloadProvider() {
        return providerRuntimeDownloadsAvailable() ? downloadProviderRuntime : undefined;
      },
      get onCancelProviderDownload() {
        return providerRuntimeDownloadsAvailable() ? cancelProviderRuntimeDownload : undefined;
      },
      get customProviders() {
        return endpoints.customProviders();
      },
      onAddCustomProvider: endpoints.saveCustomProvider,
      onDeleteCustomProvider: endpoints.deleteCustomProvider,
      // The Team API has no edit route, so only this computer's endpoints have Edit.
      onUpdateCustomProvider: local ? localEndpoints.updateCustomProvider : undefined,
      get providerKeys() {
        return providerRuntimeDownloadsAvailable() ? providerKeys() : undefined;
      },
      get connection() {
        return providerRuntimeDownloadsAvailable() ? connection : undefined;
      },
      // The browser sign-in, the install guide, the scan and custom agents are of this computer.
      get onCancelProviderSignIn() {
        return local && providerRuntimeDownloadsAvailable() ? cancelProviderSignIn : undefined;
      },
      get onInstallProvider() {
        return local && providerRuntimeDownloadsAvailable() ? openProviderInstallGuide : undefined;
      },
      onSetProviderOn: local ? setProviderOn : undefined,
      get providerUsers() {
        return Object.fromEntries(
          (agentStatus().providers ?? []).map((provider) => [
            provider.id,
            agentList()
              .filter((agent) => agent.provider === provider.id)
              .map((agent) => agent.name),
          ]),
        );
      },
      get providerAccountUsers() {
        return Object.fromEntries(
          (agentStatus().providers ?? []).map((provider) => [
            provider.id,
            Object.fromEntries(
              (provider.accounts ?? []).map((account) => [
                account.id,
                agentList()
                  .filter(
                    (agent) => agent.provider === provider.id && isAgentAccount(agent.providerAccountId, account.id),
                  )
                  .map((agent) => agent.name),
              ]),
            ),
          ]),
        );
      },
      // The active server's accounts: a joined host offers them only with `provider-accounts-v1`.
      get accountActions() {
        return providerAccounts();
      },
      // The readings are of the active server, which is the only server with a Providers tab.
      get usage() {
        return usageRows();
      },
      onRestartProvider: local ? restartProvider : undefined,
      onCancelProviderRestart: local ? cancelProviderRestart : undefined,
      get providerDetection() {
        return local ? detection.detection() : undefined;
      },
      detectedProviderApi: local ? detection.api : undefined,
      get takenAgentIds() {
        return detection.takenAgentIds();
      },
      customAgents: local ? customAgents : undefined,
      acpRegistry: serverCanAdminister(server, "acp-registry-v1") ? registryFor(server) : undefined,
      get detectionSettings() {
        return local ? (detection.settingsValue() ?? undefined) : undefined;
      },
      onDetectionSettingsChange: detection.setSettings,
      get detectionSettingsError() {
        return detection.settingsError();
      },
      onShown: local ? () => void detection.scan() : undefined,
    };
  };

  return providerSettings;
}
