import { HelpMenu, type HelpMenuNews } from "@openbot/ui/features/updates/HelpMenu";
import { whatsNewEntry } from "@openbot/ui/features/updates/whats-new";
import { createSignal } from "solid-js";
import { desktopAnalytics } from "../../analytics";
import { compareReleaseVersions } from "../updates/whats-new-history";
import { loadWhatsNewReleases } from "../updates/whats-new-releases";

/** The newest releases that the Help menu lists, one line each. */
const HELP_NEWS_COUNT = 3;

export type HelpLinkDestination = "changelog" | "guides" | "discord" | "feedback";

/**
 * The What's new list of a Help menu. The first `load` reads the release notes in the app and lists the
 * first note of each of the newest releases, up to `version`. The web has no version: it always runs
 * the newest release. The rail and the photo menu of the simple layout both use it.
 */
export function createHelpNews(version: () => string | null) {
  const [news, setNews] = createSignal<readonly HelpMenuNews[]>([]);
  let loading = false;

  async function load() {
    if (loading || news().length > 0) return;
    loading = true;
    try {
      const shown = version();
      const releases = await loadWhatsNewReleases(AbortSignal.timeout(10_000));
      setNews(
        releases
          .filter((release) => !shown || compareReleaseVersions(release.version, shown) <= 0)
          .sort((a, b) => compareReleaseVersions(b.version, a.version))
          .flatMap((release) => {
            const note = release.groups[0]?.items[0];
            return note ? [{ headline: whatsNewEntry(note).headline, date: release.date }] : [];
          })
          .slice(0, HELP_NEWS_COUNT),
      );
    } catch {
      // The menu shows its links without the list. The next opening tries again.
    } finally {
      loading = false;
    }
  }

  return { news, load };
}

/** Records the Help link, then opens it. */
export function trackHelpLink(destination: HelpLinkDestination, open: (destination: HelpLinkDestination) => void) {
  desktopAnalytics.track("help_link_opened", { destination });
  open(destination);
}

/** The Help menu of the rail, on desktop and on the web. */
export function RailHelpMenu(props: {
  version: string | null;
  onOpenWhatsNew: () => void;
  onOpenLink: (destination: HelpLinkDestination) => void;
}) {
  const help = createHelpNews(() => props.version);
  const openLink = (destination: HelpLinkDestination) => trackHelpLink(destination, props.onOpenLink);

  return (
    <HelpMenu
      news={help.news()}
      triggerClass="window-rail-button"
      onOpen={() => void help.load()}
      onOpenWhatsNew={props.onOpenWhatsNew}
      onOpenChangelog={() => openLink("changelog")}
      onOpenGuides={() => openLink("guides")}
      onOpenDiscord={() => openLink("discord")}
      onSendFeedback={() => openLink("feedback")}
    />
  );
}
