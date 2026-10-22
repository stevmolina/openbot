import { isAgentProvider } from "@openbot/contracts/ipc";
import { Marketplace } from "@openbot/ui/features/marketplace/Marketplace";
import type { MarketplaceApp } from "@openbot/ui/features/marketplace/marketplace-model";
import {
  createMarketplaceNavigation,
  type MarketplaceCustomApps,
  type MarketplaceNavigation,
  type MarketplaceProviderPage,
} from "@openbot/ui/features/marketplace/marketplace-view";
import { McpKeyDialog } from "@openbot/ui/features/settings/McpKeyDialog";
import { McpLocalDialog } from "@openbot/ui/features/settings/McpLocalDialog";
import { McpSignInDialog } from "@openbot/ui/features/settings/McpSignInDialog";
import { McpSignInRelayDialog } from "@openbot/ui/features/settings/McpSignInPage";
import { PluginUninstallDialog } from "@openbot/ui/features/settings/PluginUninstallDialog";
import { createEffect, createSignal, Match, Show, Switch, untrack } from "solid-js";
import { simpleLayout } from "../../simple-layout";
import { type ServerMcpOptions, ServerMcpPage } from "../servers/ServerMcpPage";
import { createMarketplaceController, type MarketplaceControllerProps } from "./marketplace-controller";
import { type HostProviderSettings, HostProviderSettingsPanel } from "./ProviderSettingsSection";

export interface MarketplaceModalProps extends MarketplaceControllerProps {
  /**
   * The listing an `openbot://plugins/<slug>` link or a chat suggestion asked for. It opens the app
   * page; a link never connects, so what a link can do is show a user a listing they then decide
   * about.
   */
  initialPluginSlug?: string | undefined;
  /**
   * The person pressed Connect for `initialPluginSlug` on a chat suggestion card, so the page starts
   * the connect step with its sign-in and approval dialogs. An agent cannot set it.
   */
  initialPluginConnect?: boolean | undefined;
  /**
   * Runs after the modal consumes `initialPluginSlug`. The owner clears the pending slug there, so
   * a second link to the same listing reads as a new request instead of no change.
   */
  onInitialPluginSlugConsumed?: (() => void) | undefined;
  /** A dialog, or a page of the desktop window. */
  variant?: "dialog" | "page" | undefined;
  /**
   * Where the user is. The owner keeps it when another part of the window opens the Apps tab or the
   * custom apps page. Absent: the Marketplace keeps its own.
   */
  nav?: MarketplaceNavigation | undefined;
  /** The MCP servers of the host, for the custom apps page. Absent when this account cannot manage them. */
  customApps?: ServerMcpOptions | undefined;
  /**
   * The AI providers of the host, for the page of one provider in the Apps area. Absent when this
   * account cannot manage them.
   */
  providers?: HostProviderSettings | undefined;
  /** The joined server whose providers `providers` holds. Absent: this computer. */
  providersHostName?: string | undefined;
  /** The server of `providers`. Another server opens a new provider page. */
  providersServerId?: string | undefined;
}

/** The Marketplace on this computer's or a joined server's data, with the dialogs it opens. */
export function MarketplaceModal(props: MarketplaceModalProps) {
  const nav = props.nav ?? createMarketplaceNavigation();
  const controller = createMarketplaceController(props);
  /** The page of one AI provider: the provider page of the server settings, opened on that provider. */
  const [providerMount, setProviderMount] = createSignal<HTMLElement>();
  const providerPage: MarketplaceProviderPage = (page) => (
    // Keyed on the server: another server's providers start a new page, which reads that server's state.
    <Show when={props.providers ? `server:${props.providersServerId ?? "local"}` : undefined} keyed>
      {(serverKey) => (
        <Show when={serverKey ? props.providers : undefined}>
          {(providers) => (
            <div ref={setProviderMount} class="marketplace-provider-panel">
              <HostProviderSettingsPanel
                {...providers()}
                hostName={props.providersHostName}
                selectMount={providerMount()}
                initialProvider={isAgentProvider(page.id) ? page.id : undefined}
              />
            </div>
          )}
        </Show>
      )}
    </Show>
  );
  /** Apps › Custom apps. Each change there reads the apps again, so the cards show it. */
  const customApps: MarketplaceCustomApps = (page) => (
    // Keyed on the server: another server opens a new page, which reads that server's list.
    <Show when={props.customApps?.serverId} keyed>
      {(serverId) => (
        <Show when={props.customApps?.serverId === serverId ? props.customApps : undefined}>
          {(options) => <ServerMcpPage options={options()} adding={page.adding} onChanged={controller.reloadApps} />}
        </Show>
      )}
    </Show>
  );
  /**
   * A Connect press from a chat card. It runs when the listing is in the apps and their states are
   * read, so an installed app is not installed again.
   */
  const [connectWhenReady, setConnectWhenReady] = createSignal<string | null>(null);
  const startConnect = (slug: string) => {
    const model = controller.model;
    const app = model.apps().find((candidate) => candidate.id === slug);
    if (!app || app.status === "connected") return;
    // A connector's page, which is open now, shows its dialogs, such as GitHub's device code.
    if (app.kind === "connector") {
      if (app.status === "idle") model.connector(app.connector)?.connect?.();
    } else if (app.kind === "plugin" && model.canConnectApps()) void model.connectApp(app);
  };

  createEffect(
    () => (props.open ? props.initialPluginSlug : undefined),
    (slug) => {
      if (!slug) return;
      // A link replaces the page on screen.
      nav.reset();
      nav.set((draft) => {
        draft.tab = "apps";
      });
      setConnectWhenReady(untrack(() => props.initialPluginConnect) === true ? slug : null);
      if (untrack(() => controller.model.apps().some((app) => app.id === slug))) {
        nav.go({ kind: "app", id: slug });
      } else {
        nav.set((draft) => {
          draft.missingApp = slug;
        });
      }
      // The page holds this listing now, so the owner forgets the link: the same slug arriving
      // again changes the signal from nothing, and this effect runs for it.
      untrack(() => props.onInitialPluginSlugConsumed)?.();
    },
  );

  /* GitHub joins the apps only when its status read ends. A link that came first opens its page then. */
  createEffect(
    () => {
      const slug = nav.state.missingApp;
      return slug && controller.model.apps().some((app) => app.id === slug) ? slug : null;
    },
    (slug) => {
      if (slug) nav.go({ kind: "app", id: slug });
    },
  );

  createEffect(
    () => {
      const slug = connectWhenReady();
      if (!slug) return null;
      // A connector shows "idle" before its first read, so a connected one could connect again.
      const read = (app: MarketplaceApp) =>
        app.kind !== "connector" || controller.model.connector(app.connector)?.ready() === true;
      return controller.appStatesRead() && controller.model.apps().some((app) => app.id === slug && read(app))
        ? slug
        : null;
    },
    (slug) => {
      if (!slug) return;
      setConnectWhenReady(null);
      untrack(() => startConnect(slug));
    },
  );
  // A page that the server on screen cannot show goes back to the Apps tab: the user switched to a
  // server where this account manages no MCP servers or no providers.
  createEffect(
    () => {
      const view = nav.state.stack.at(-1);
      return (view?.kind === "custom-apps" && !props.customApps) || (view?.kind === "provider" && !props.providers);
    },
    (gone) => {
      if (gone) nav.backTo(0);
    },
  );
  // Slack, Discord and Telegram change with no event from main, so each available connector is
  // followed while the window is open.
  createEffect(
    () => (props.open ? props.connectors?.available() : undefined),
    (controllers) => {
      const stops = (controllers ?? []).map((connector) => connector.watch());
      return () => {
        for (const stop of stops) stop();
      };
    },
  );
  /* A Connect press ends with the window, so a later open does not connect. */
  createEffect(
    () => props.open,
    (open) => {
      if (!open) setConnectWhenReady(null);
    },
  );

  return (
    <>
      <Marketplace
        model={controller.model}
        nav={nav}
        open={props.open}
        onOpenChange={props.onOpenChange}
        variant={props.variant}
        simple={simpleLayout()}
        customApps={props.customApps ? customApps : undefined}
        providerPage={props.providers ? providerPage : undefined}
      />
      {/* The confirmation and the connect step are beside the Marketplace: each is one decision
          over the page it was started from, not a part of that page. */}
      <Show when={controller.uninstalling()} keyed>
        {(plugin) => (
          <PluginUninstallDialog
            open={true}
            plan={controller.uninstallPlan(plugin)}
            busy={controller.uninstallBusy(plugin)}
            onConfirm={() => void controller.uninstallPlugin(plugin)}
            onCancel={controller.cancelUninstall}
          />
        )}
      </Show>
      <Show when={controller.connecting()} keyed>
        {(pending) => (
          <Switch>
            <Match when={pending.flow.kind === "link"}>
              <McpSignInDialog
                open={true}
                subject={pending.subject}
                onTest={controller.signInPluginApp}
                onConnected={(config) => pending.settle(config)}
                onCancel={() => pending.settle(null)}
                hostName={props.pluginSignInRelay ? props.pluginHostName : undefined}
                onCancelSignIn={controller.cancelSignInRelay}
              />
              {/* The page opens in this computer's browser; the paste field is the way back when the
                  browser cannot reach this computer's listener. */}
              <Show when={controller.signInRelayed()} keyed>
                {(relay) => (
                  <McpSignInRelayDialog
                    name={pending.subject.name}
                    hostName={props.pluginHostName ?? ""}
                    page={relay.page}
                    onOpen={controller.openSignInRelay}
                    onPaste={controller.pasteSignInRelay}
                    onCancel={controller.cancelSignInRelay}
                  />
                )}
              </Show>
            </Match>
            <Match when={pending.flow.kind === "key" ? pending.flow : null} keyed>
              {(flow) => (
                <McpKeyDialog
                  open={true}
                  subject={pending.subject}
                  flow={flow}
                  onTest={controller.testPluginApp}
                  onConnected={(config) => pending.settle(config)}
                  onCancel={() => pending.settle(null)}
                  onOpenUrl={controller.openPluginUrl}
                  hostName={props.pluginHostName}
                />
              )}
            </Match>
            <Match when={pending.flow.kind === "local" ? pending.flow : null} keyed>
              {(flow) => (
                <McpLocalDialog
                  open={true}
                  subject={pending.subject}
                  flow={flow}
                  onTest={controller.testPluginApp}
                  onConnected={(config) => pending.settle(config)}
                  onCancel={() => pending.settle(null)}
                  onOpenUrl={controller.openPluginUrl}
                />
              )}
            </Match>
          </Switch>
        )}
      </Show>
    </>
  );
}
