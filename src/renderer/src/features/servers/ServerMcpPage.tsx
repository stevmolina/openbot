import { Button, ChevronLeft, Text } from "@openbot/ui";
import { SaveBarDock } from "@openbot/ui/features/settings/SettingsDialogShell";
import { useText } from "@openbot/ui/text";
import { createSignal, onSettled, Show } from "solid-js";
import type { McpServerConfig, McpTestResult } from "./mcp-servers";
import { type McpPanelDetail, type McpPanelSignIn, ServerMcpPanel } from "./ServerMcpPanel";

/**
 * The MCP servers of one server, with the calls that change them. The caller gives this only when
 * the account can manage them: a remote host answers 403 to a `member` and 400 without the capability.
 */
export interface ServerMcpOptions {
  /** The server whose MCP servers these are. Another server opens a new page, with its own read. */
  serverId: string;
  servers: McpServerConfig[];
  canManage: boolean;
  /** Why the list is empty, when the read failed rather than found nothing. */
  loadError?: string | null | undefined;
  /**
   * What the managed runtime under a STDIO server is doing, when there is anything to say. The
   * caller decides: it describes this computer, and the page also shows a joined server.
   */
  toolRuntimeNote?: string | null | undefined;
  /** Reads the list. The page calls it when it opens, because most visits to the Apps area never open it. */
  onShown?: (() => void) | undefined;
  onRetryLoad?: (() => void) | undefined;
  onSave: (config: McpServerConfig) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onSetEnabled: (id: string, enabled: boolean) => Promise<void>;
  onTest: (config: McpServerConfig) => Promise<McpTestResult>;
  /** Browser sign-in for http MCP servers: on this computer, or through a host that relays its page. */
  signIn?: McpPanelSignIn | undefined;
  /** An MCP row to sign in to when the list holds it: the user pressed Sign in on an agent's card. */
  signInRequest?: string | null | undefined;
  onSignInRequestHandled?: (() => void) | undefined;
}

/**
 * Apps › Custom apps: the MCP servers of the server on screen. The user adds one by its address or
 * its command, and turns it on or off, tests it, signs in to it, edits it and removes it. It is the
 * list that Server settings › MCP showed, in the Apps area, with the form's save bar under it.
 */
export function ServerMcpPage(props: {
  options: ServerMcpOptions;
  /** Opens the form for a new server. */
  adding: boolean;
  /** Called after each change to the list, so the app cards show it. */
  onChanged?: (() => void) | undefined;
}) {
  const { t } = useText();
  const [detail, setDetail] = createSignal<McpPanelDetail | null>(null);
  const [page, setPage] = createSignal<HTMLElement>();
  onSettled(() => props.options.onShown?.());
  const changed = async (work: Promise<void>) => {
    await work;
    props.onChanged?.();
  };

  return (
    <div
      ref={setPage}
      class="marketplace-view server-mcp-page"
      // The Marketplace does not go back on Escape while the form holds a change.
      data-marketplace-unsaved={detail()?.saveBar() ? "" : undefined}
    >
      <Show when={detail()}>
        {(form) => (
          <div class="server-mcp-page-head">
            <Button type="button" variant="ghost" size="sm" data-cuelume-tap="navigate" onClick={form().back}>
              <ChevronLeft aria-hidden="true" />
              {t("mcp.panel.title")}
            </Button>
            <h3 class="server-mcp-page-title">{form().title}</h3>
          </div>
        )}
      </Show>
      <ServerMcpPanel
        servers={props.options.servers}
        canManage={props.options.canManage}
        menuMount={page()}
        loadError={props.options.loadError}
        toolRuntimeNote={props.options.toolRuntimeNote}
        onRetryLoad={props.options.onRetryLoad}
        onDetailChange={setDetail}
        onSave={(config) => changed(props.options.onSave(config))}
        onRemove={(id) => changed(props.options.onRemove(id))}
        onSetEnabled={(id, enabled) => changed(props.options.onSetEnabled(id, enabled))}
        onTest={(config) => props.options.onTest(config)}
        signIn={props.options.signIn}
        signInRequest={props.options.signInRequest}
        onSignInRequestHandled={props.options.onSignInRequestHandled}
        startAdding={props.adding}
      />
      {/* The form's save bar stays at the bottom of the page while the form scrolls, as it stays in
          the footer of a settings page. It appears only once the form holds a change. */}
      <div class="server-mcp-page-save">
        <SaveBarDock value={detail()?.saveBar() ?? null}>
          {(bar) => (
            <section class="settings-modal-save-bar" aria-label={t("server.settings.unsavedMcpChanges")}>
              <Show
                when={bar().failed}
                fallback={
                  <Text variant="caption" tone="muted">
                    {bar().message}
                  </Text>
                }
              >
                <Text variant="caption" tone="danger" role="alert">
                  {bar().message}
                </Text>
              </Show>
              <div class="settings-modal-save-actions">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={bar().resetDisabled}
                  onClick={() => detail()?.reset()}
                >
                  {t("server.settings.reset")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="default"
                  loading={bar().saving}
                  loadingLabel={t("common.saving")}
                  disabled={bar().saveDisabled}
                  onClick={() => detail()?.save()}
                >
                  {t("common.save")}
                </Button>
              </div>
            </section>
          )}
        </SaveBarDock>
      </div>
    </div>
  );
}
