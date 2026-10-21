import { isUpdateActivePhase } from "@openbot/contracts/ipc";
import {
  ArrowLeftRight,
  BookOpen,
  ChartArea,
  Check,
  ChevronRight,
  CircleFadingArrowUp,
  CircleQuestionMark,
  DropdownMenu,
  Gift,
  Megaphone,
  MotionTooltip,
  Plus,
  Settings,
  Smartphone,
  UserAvatar,
} from "@openbot/ui";
import { ServerActionItems } from "@openbot/ui/features/servers/ServerActionItems";
import { ServerMark, serverStatusLabels } from "@openbot/ui/features/servers/ServerRail";
import { DiscordMark } from "@openbot/ui/features/settings/brand-marks";
import { useText } from "@openbot/ui/text";
import { createSignal, For, Show } from "solid-js";
import { appPort } from "../../app-port";
import { usePlatform } from "../../platform";
import { useAuth } from "../account/account-context";
import { useServerActions } from "../servers/server-actions";
import { useSettings } from "../settings/settings-context";
import { useUpdates } from "../updates/updates-context";
import { useWhatsNew } from "../updates/whats-new-context";
import { createHelpNews, type HelpLinkDestination, trackHelpLink } from "../window/RailHelpMenu";
import { useWindowPage } from "../window/window-page-context";

/** A release date in local time. `new Date("YYYY-MM-DD")` reads UTC and can show the day before. */
function releaseDate(value: string): Date {
  const [year = 0, month = 1, day = 1] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * The photo at the start of the bottom bar, and its menu. It holds what the rail and the top row held
 * that the user needs less often: Settings, Usage, Help, the host switcher, the app update and the
 * mobile app.
 */
export function SimplePhotoMenu(props: { current: boolean }) {
  const { t, format } = useText();
  const auth = useAuth();
  const platform = usePlatform();
  const windowPage = useWindowPage();
  const { openAppSettings } = useSettings();
  const updates = useUpdates();
  const whatsNew = useWhatsNew();
  const serverActions = useServerActions();
  const help = createHelpNews(() => whatsNew.state.version);
  const [open, setOpen] = createSignal(false);
  let trigger: HTMLElement | undefined;

  const account = () => auth.signedInAccount();
  const updateNotice = () => {
    const phase = updates.status().phase;
    if (!isUpdateActivePhase(phase)) return undefined;
    return t(phase === "ready" || phase === "installing" ? "account.update.ready" : "account.update.available");
  };
  const activeServer = () => serverActions.orderedServers().find((server) => server.active);
  const openLink = (destination: HelpLinkDestination) =>
    trackHelpLink(destination, (target) => void appPort().openExternal(target));
  const label = () => (updateNotice() ? `${t("simple.bar.account")}. ${updateNotice()}` : t("simple.bar.account"));

  return (
    <DropdownMenu.Root
      open={open()}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) void help.load();
      }}
      placement="top-start"
      gutter={8}
    >
      <MotionTooltip content={label()} suppressed={open()} placement="top">
        <DropdownMenu.Trigger
          ref={(element) => (trigger = element)}
          class="simple-bar-photo no-drag"
          aria-label={label()}
          aria-current={props.current ? "page" : undefined}
        >
          <Show when={account()} fallback={<span class="simple-bar-photo-image" aria-hidden="true" />}>
            {(user) => <UserAvatar user={user()} class="simple-bar-photo-image" decorative />}
          </Show>
          <Show when={updateNotice()}>
            <span class="simple-bar-photo-notice" aria-hidden="true" />
          </Show>
        </DropdownMenu.Trigger>
      </MotionTooltip>
      <DropdownMenu.Portal>
        <DropdownMenu.Content class="agent-context-menu simple-photo-menu" aria-label={t("simple.bar.account")}>
          <Show when={account()}>
            {(user) => (
              <div class="ui-menu-label simple-photo-menu-account" aria-hidden="true">
                <span class="simple-photo-menu-name">{user().name?.trim() || user().email}</span>
                <Show when={user().name?.trim()}>
                  <span class="simple-photo-menu-email">{user().email}</span>
                </Show>
              </div>
            )}
          </Show>
          <Show when={updateNotice()}>
            {(notice) => (
              <DropdownMenu.Item onSelect={() => openAppSettings(trigger ?? null, "updates")}>
                <CircleFadingArrowUp class="agent-context-icon size-4" aria-hidden="true" />
                <span>{notice()}</span>
              </DropdownMenu.Item>
            )}
          </Show>
          <DropdownMenu.Item onSelect={() => windowPage.openSettings(trigger ?? null)}>
            <Settings class="agent-context-icon size-4" aria-hidden="true" />
            <span>{t("app.rail.settings")}</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => windowPage.openUsage(trigger ?? null)}>
            <ChartArea class="agent-context-icon size-4" aria-hidden="true" />
            <span>{t("app.rail.usage")}</span>
          </DropdownMenu.Item>
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger>
              <CircleQuestionMark class="agent-context-icon size-4" aria-hidden="true" />
              <span>{t("app.help.label")}</span>
              <ChevronRight class="agent-context-submenu-chevron size-4" aria-hidden="true" />
            </DropdownMenu.SubTrigger>
            <DropdownMenu.Portal>
              <DropdownMenu.SubContent class="ui-action-menu agent-context-menu help-menu">
                <Show when={help.news().length > 0}>
                  <div class="ui-menu-label" aria-hidden="true">
                    {t("app.help.whatsNew")}
                  </div>
                  <For each={help.news()}>
                    {(item) => (
                      <DropdownMenu.Item class="help-menu-news" onSelect={() => whatsNew.reopen()}>
                        <span class="help-menu-news-headline" title={item.headline}>
                          {item.headline}
                        </span>
                        <span class="ui-menu-trailing">
                          {format.date(releaseDate(item.date), { month: "short", day: "numeric" })}
                        </span>
                      </DropdownMenu.Item>
                    )}
                  </For>
                </Show>
                <DropdownMenu.Item onSelect={() => openLink("changelog")}>
                  <Gift class="agent-context-icon size-4" aria-hidden="true" />
                  <span>{t("app.help.changelog")}</span>
                </DropdownMenu.Item>
                <DropdownMenu.Separator />
                <DropdownMenu.Item onSelect={() => openLink("guides")}>
                  <BookOpen class="agent-context-icon size-4" aria-hidden="true" />
                  <span>{t("app.help.guides")}</span>
                </DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => openLink("discord")}>
                  <DiscordMark class="agent-context-icon size-4" />
                  <span>{t("app.help.discord")}</span>
                </DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => openLink("feedback")}>
                  <Megaphone class="agent-context-icon size-4" aria-hidden="true" />
                  <span>{t("account.menu.sendFeedback")}</span>
                </DropdownMenu.Item>
              </DropdownMenu.SubContent>
            </DropdownMenu.Portal>
          </DropdownMenu.Sub>
          <Show when={platform.appInfo()}>
            <DropdownMenu.Sub>
              <DropdownMenu.SubTrigger>
                <ArrowLeftRight class="agent-context-icon size-4" aria-hidden="true" />
                <span>{t("simple.menu.switchHost")}</span>
                <ChevronRight class="agent-context-submenu-chevron size-4" aria-hidden="true" />
              </DropdownMenu.SubTrigger>
              <DropdownMenu.Portal>
                <DropdownMenu.SubContent
                  class="ui-action-menu agent-context-menu server-menu"
                  aria-label={t("server.menu.label")}
                >
                  <div class="ui-menu-label" aria-hidden="true">
                    {t("server.rail.label")}
                  </div>
                  <For each={serverActions.orderedServers()} keyed={(server) => server.id}>
                    {(server) => (
                      <DropdownMenu.Item
                        class="server-menu-row"
                        aria-label={[server().name, ...serverStatusLabels(server(), t)].join(", ")}
                        aria-current={server().active ? "true" : undefined}
                        onSelect={() => {
                          if (!server().active) serverActions.select(server().id);
                        }}
                      >
                        <span class="ui-menu-check" data-checked={server().active ? "" : undefined} aria-hidden="true">
                          <Show when={server().active}>
                            <Check />
                          </Show>
                        </span>
                        <span class="server-menu-mark" aria-hidden="true">
                          <ServerMark server={server()} />
                        </span>
                        <span class="server-menu-name">{server().name}</span>
                      </DropdownMenu.Item>
                    )}
                  </For>
                  <DropdownMenu.Item class="server-menu-add" onSelect={() => serverActions.add()}>
                    <span class="server-menu-add-circle" aria-hidden="true">
                      <Plus />
                    </span>
                    <span>{t(serverActions.addCreatesServer() ? "server.rail.add" : "server.rail.addRemote")}</span>
                  </DropdownMenu.Item>
                  <Show when={activeServer()}>
                    {(server) => (
                      <>
                        <DropdownMenu.Separator />
                        <ServerActionItems
                          menu={DropdownMenu}
                          server={server()}
                          trigger={() => trigger ?? null}
                          {...serverActions.callbacks}
                        />
                      </>
                    )}
                  </Show>
                </DropdownMenu.SubContent>
              </DropdownMenu.Portal>
            </DropdownMenu.Sub>
          </Show>
          <Show when={!platform.landingPreview}>
            <DropdownMenu.Separator />
            <DropdownMenu.Item onSelect={() => openAppSettings(trigger ?? null, "mobile-connect")}>
              <Smartphone class="agent-context-icon size-4" aria-hidden="true" />
              <span>{t("sidebar.mobileApp.title")}</span>
            </DropdownMenu.Item>
          </Show>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
