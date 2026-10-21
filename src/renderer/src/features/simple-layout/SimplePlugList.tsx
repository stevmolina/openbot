import { ProviderLogo } from "@openbot/brand";
import { Button, Link, MotionTooltip, Store } from "@openbot/ui";
import { AccountUsageDetails } from "@openbot/ui/features/account/AccountUsageDetails";
import { type AccountUsageProviderRow, accountUsageRowKey } from "@openbot/ui/features/account/account-usage-view";
import { useText } from "@openbot/ui/text";
import { For, Show } from "solid-js";
import { useConnectors } from "../connectors/connectors-context";
import { useServerSettings } from "../servers/server-settings";
import { useServers } from "../servers/servers-context";
import { useSettings } from "../settings/settings-context";
import { usePlanLimitRows } from "../usage/plan-limit-rows";
import { useWindowPage } from "../window/window-page-context";
import { SimpleSidebarLink } from "./SimpleSidebarLink";

/**
 * One AI provider: its logo, its name and a dot. The dot is green while the provider has room, and
 * orange when a limit is close or reached. As its rail ring did, the row opens the usage page, and its
 * hover card shows the limits with their reset times.
 */
function ProviderRow(props: { row: AccountUsageProviderRow; onOpen: (button: HTMLElement) => void }) {
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
 * The plug list: the Marketplace, the connectors of the server, then one row per AI provider account,
 * the accounts that the rail showed as usage rings.
 */
export function SimplePlugList() {
  const { t } = useText();
  const windowPage = useWindowPage();
  const { setSkillsMarketplaceOpen } = useSettings();
  const { activeServer } = useServers();
  const { openServerSettings } = useServerSettings();
  const connectors = useConnectors();
  const providerRows = usePlanLimitRows();
  const connectorCount = () => connectors.active.available().length;

  return (
    <div class="simple-sidebar-links simple-sidebar-list">
      <SimpleSidebarLink
        label={t("app.rail.marketplace")}
        icon={<Store />}
        current={windowPage.page() === "marketplace"}
        onClick={() => setSkillsMarketplaceOpen(true)}
      />
      {/* The server settings hold the connectors, and show their section only while one is available. */}
      <Show when={connectorCount() > 0 ? activeServer() : undefined}>
        {(server) => (
          <SimpleSidebarLink
            label={t("server.settings.connectorsTitle")}
            icon={<Link />}
            meta={String(connectorCount())}
            current={windowPage.page() === "server-settings"}
            onClick={(button) => openServerSettings(server().id, button, "connectors")}
          />
        )}
      </Show>
      <Show when={providerRows().length > 0}>
        <h2 class="simple-sidebar-group">{t("simple.plug.providers")}</h2>
        {/* A status update builds new rows. The key keeps each row, and its open hover card, mounted. */}
        <For each={providerRows()} keyed={accountUsageRowKey}>
          {(row) => <ProviderRow row={row()} onOpen={windowPage.openUsage} />}
        </For>
      </Show>
    </div>
  );
}
