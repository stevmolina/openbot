import { ProviderLogo } from "@openbot/brand";
import { Button, MotionTooltip, Plug, Store } from "@openbot/ui";
import { AccountUsageDetails } from "@openbot/ui/features/account/AccountUsageDetails";
import { type AccountUsageProviderRow, accountUsageRowKey } from "@openbot/ui/features/account/account-usage-view";
import { useText } from "@openbot/ui/text";
import { For, Show } from "solid-js";
import { useServers } from "../servers/servers-context";
import { useHostProviderSettings } from "../settings/host-provider-settings";
import { useSettings } from "../settings/settings-context";
import { usePlanLimitRows } from "../usage/plan-limit-rows";
import { useWindowPage } from "../window/window-page-context";
import { SimpleSidebarLink } from "./SimpleSidebarLink";

/**
 * One AI provider: its logo, its name and a dot. The dot is green while the provider has room, and
 * orange when a limit is close or reached. The row opens the page of the provider in the Apps area,
 * and its hover card shows the limits with their reset times.
 */
function ProviderRow(props: { row: AccountUsageProviderRow; current: boolean; onOpen: (button: HTMLElement) => void }) {
  const { t } = useText();
  const attention = () => props.row.tone !== "neutral";
  const label = () =>
    t(attention() ? "simple.plug.providerAttention" : "simple.plug.providerOn", { name: props.row.name });
  const button = () => (
    <Button
      variant="ghost"
      type="button"
      class="simple-sidebar-link simple-provider-row"
      aria-label={label()}
      aria-current={props.current ? "page" : undefined}
      data-cuelume-navigate=""
      onClick={(event) => props.onOpen(event.currentTarget)}
    >
      <span class="simple-provider-logo" aria-hidden="true">
        <ProviderLogo provider={props.row.provider} />
      </span>
      <span class="simple-sidebar-link-label">{props.row.name}</span>
      <span class="simple-provider-dot" data-attention={attention() ? "" : undefined} aria-hidden="true" />
    </Button>
  );
  return (
    <Show when={props.row.reportsUsage && props.row.windows.length > 0} fallback={button()}>
      <MotionTooltip
        content={
          <AccountUsageDetails
            rows={[props.row]}
            loading={false}
            error={null}
            refreshActive={false}
            refreshDisabled
            onRefresh={() => undefined}
            title={<h2 class="account-usage-popover-title">{t("account.usage.title")}</h2>}
          />
        }
        class="ui-popover-menu-surface account-usage-popover window-rail-usage-card"
        placement="right-start"
        openDelay={250}
        closeDelay={75}
      >
        {button()}
      </MotionTooltip>
    </Show>
  );
}

/**
 * The plug list: the Marketplace, its Apps area, then one row per AI provider account, the accounts
 * that the rail showed as usage rings. The connectors and the MCP servers are apps, so they are in
 * the Apps area, not in the server settings.
 */
export function SimplePlugList() {
  const { t } = useText();
  const windowPage = useWindowPage();
  const { setSkillsMarketplaceOpen, marketplaceNav, openApps, openProvider } = useSettings();
  const { activeServer } = useServers();
  const providerSettings = useHostProviderSettings();
  const providerRows = usePlanLimitRows();
  const marketplaceOpen = () => windowPage.page() === "marketplace";
  /** The provider whose page is open in the Apps area, if one is. */
  const openProviderId = () => {
    const view = marketplaceNav.state.stack.at(-1);
    return marketplaceOpen() && view?.kind === "provider" ? view.id : null;
  };
  const appsOpen = () => marketplaceOpen() && marketplaceNav.state.tab === "apps" && openProviderId() === null;
  /**
   * A provider row opens its page in the Apps area, not the server settings. An account that cannot
   * manage the providers of this server sees the usage page, as before.
   */
  const openRow = (row: AccountUsageProviderRow, button: HTMLElement) => {
    const server = activeServer();
    if (server && providerSettings(server)) openProvider(row.provider, row.name);
    else windowPage.openUsage(button);
  };

  return (
    <div class="simple-sidebar-links simple-sidebar-list">
      <SimpleSidebarLink
        label={t("app.rail.marketplace")}
        icon={<Store />}
        current={marketplaceOpen() && marketplaceNav.state.tab !== "apps" && openProviderId() === null}
        onClick={() => {
          // The Marketplace row starts on the first tab, also while the Apps tab is open.
          marketplaceNav.reset();
          setSkillsMarketplaceOpen(true);
        }}
      />
      <SimpleSidebarLink
        label={t("marketplace.tab.apps")}
        icon={<Plug />}
        current={appsOpen()}
        onClick={() => openApps()}
      />
      <Show when={providerRows().length > 0}>
        <h2 class="simple-sidebar-group">{t("simple.plug.providers")}</h2>
        {/* A status update builds new rows. The key keeps each row, and its open hover card, mounted. */}
        <For each={providerRows()} keyed={accountUsageRowKey}>
          {(row) => (
            <ProviderRow
              row={row()}
              current={openProviderId() === row().provider}
              onOpen={(button) => openRow(row(), button)}
            />
          )}
        </For>
      </Show>
    </div>
  );
}
