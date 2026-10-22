import type { McpServerConfig, McpSignInState, McpTestResult } from "@openbot/contracts/ipc";
import { sourceText } from "@openbot/i18n/source";
import { createSignal, createStore } from "solid-js";
import { fn } from "storybook/test";
import type { ServerMcpOptions } from "../src/features/servers/ServerMcpPage";
import type { McpPanelSignIn } from "../src/features/servers/ServerMcpPanel";
import { STORY_MCP_SERVERS } from "../src/preview/fixtures";
import { createSignInHost } from "./mcp-sign-in-host";

/**
 * A joined server's MCP list. Granola asks for a sign-in on Test connection; Linear is signed in
 * already. Sign in shows the server's page from the host's browser: Allow finishes the sign-in, and
 * Cancel sign-in stops it.
 */
export const STORY_CUSTOM_APP_SERVERS: McpServerConfig[] = [
  {
    id: "mcp-granola",
    name: "Granola",
    transport: "http",
    enabled: true,
    command: "",
    args: [],
    env: [],
    envPassthrough: [],
    workingDirectory: "",
    url: "https://mcp.granola.ai/mcp",
    headers: [],
  },
  ...STORY_MCP_SERVERS.filter((config) => config.id === "mcp-linear" || config.id === "mcp-sqlite").map((config) => ({
    ...config,
    headers: [],
  })),
];

/**
 * The MCP calls of Apps › Custom apps on fixtures. A save, a removal and a switch change the list, a
 * sign-in finishes at once on this computer, and a joined server shows its sign-in page.
 */
export function createStoryMcpOptions(input: {
  servers: McpServerConfig[];
  /** A joined server signs in through its host's browser. Absent: this computer. */
  remoteHostName?: string | undefined;
  canManage?: boolean | undefined;
  initial?: Record<string, McpSignInState> | undefined;
}): ServerMcpOptions {
  const [states, setStates] = createStore<Record<string, McpSignInState>>({
    "mcp-linear": { mcpServerId: "mcp-linear", signedIn: true },
    ...input.initial,
  });
  const [servers, setServers] = createSignal(input.servers);
  const save = async (config: McpServerConfig) => {
    const id = config.id || `mcp-${config.name.toLowerCase().replaceAll(" ", "-")}`;
    // A draft signs in before it has an id: the new row keeps that sign-in.
    if (!config.id && states[""]?.signedIn)
      setStates((current) => {
        current[id] = { mcpServerId: id, signedIn: true };
        delete current[""];
      });
    setServers((list) =>
      list.some((server) => server.id === id)
        ? list.map((server) => (server.id === id ? { ...config, id } : server))
        : [...list, { ...config, id }],
    );
  };
  const remote = input.remoteHostName;
  const host = createSignInHost();
  const waiting = new Map<string, (result: McpTestResult) => void>();
  const finish = (url: string, result: McpTestResult) => {
    host.close(url);
    waiting.get(url)?.(result);
    waiting.delete(url);
  };
  const signIn: McpPanelSignIn = {
    states,
    ...(remote ? { remote: { hostName: remote, runtime: host.runtime, clipboard: true, pages: host.pages } } : {}),
    start: (config) =>
      new Promise((resolve) => {
        waiting.set(config.url, (result) => {
          if (!result.error)
            setStates((current) => {
              current[config.id] = { mcpServerId: config.id, signedIn: true };
            });
          resolve(result);
        });
        if (!remote) finish(config.url, { toolCount: 6, error: null });
        else host.open(config.url, config.name, () => finish(config.url, { toolCount: 6, error: null }));
      }),
    cancel: async (url) => finish(url, { toolCount: 0, error: sourceText("error.backend.mcpSignInCancelled") }),
    signOut: async (id) =>
      setStates((current) => {
        delete current[id];
      }),
  };
  return {
    serverId: remote ? "story-remote" : "local",
    get servers() {
      return servers();
    },
    canManage: input.canManage ?? true,
    onShown: fn(),
    onSave: save,
    onRemove: async (id) => {
      setServers((list) => list.filter((server) => server.id !== id));
    },
    onSetEnabled: async (id, enabled) => {
      setServers((list) => list.map((server) => (server.id === id ? { ...server, enabled } : server)));
    },
    onTest: async (config) => {
      if (config.transport === "http" && !states[config.id]?.signedIn)
        return { toolCount: 0, error: sourceText("error.backend.mcpSignInRequired") };
      return { toolCount: 6, error: null };
    },
    signIn,
  };
}
