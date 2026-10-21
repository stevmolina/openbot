import type { MarketplaceAgentSummary } from "@openbot/contracts/ipc";
import { Button, Heading, Text } from "@openbot/ui";
import { avatarHeadColor } from "@openbot/ui/bloub-avatar";
import { AgentAvatar } from "@openbot/ui/features/agents/AgentAvatar";
import { useText } from "@openbot/ui/text";
import { createSignal, For, Show } from "solid-js";
import { AgentState, useInstalls } from "./MarketplaceCards";
import type { MarketplaceScope } from "./marketplace-view";

/** How many agents the list shows before "View all". Two columns, so three rows. */
const LIST_LIMIT = 6;
const FEATURED_LIMIT = 4;

/** The agent's own colour, which names it on its card. */
function agentColor(listing: MarketplaceAgentSummary): string {
  return avatarHeadColor(listing.avatarSeed, listing.avatarHue);
}

/** A "Most installed" card: a big face, the name in the agent's colour, and its installs. */
function FeaturedAgent(props: { scope: MarketplaceScope; listing: MarketplaceAgentSummary }) {
  const { t } = useText();
  const installs = useInstalls();
  return (
    <Button
      type="button"
      variant="ghost"
      class="simple-market-feature"
      data-cuelume-tap="navigate"
      style={{ "--simple-market-agent": agentColor(props.listing) }}
      aria-label={t("marketplace.open", { name: props.listing.name })}
      onClick={() => props.scope.nav.go({ kind: "agent", listing: props.listing })}
    >
      <span class="simple-market-feature-face">
        <AgentAvatar agent={props.listing} motion="hover" />
      </span>
      <span class="simple-market-feature-name">{props.listing.name}</span>
      <span class="simple-market-feature-installs">{installs(props.listing.installs)}</span>
    </Button>
  );
}

/** A row of the list: face, name, one line about it, and the gray Add button above the hit area. */
function AgentRow(props: { scope: MarketplaceScope; listing: MarketplaceAgentSummary }) {
  const { t } = useText();
  const id = () => `marketplace-agent-${props.listing.id}`;
  let hit: HTMLButtonElement | undefined;
  return (
    <article class="simple-market-row" aria-labelledby={id()}>
      <Button
        type="button"
        variant="ghost"
        class="marketplace-hitarea"
        data-cuelume-tap="navigate"
        ref={(element) => (hit = element)}
        aria-label={t("marketplace.open", { name: props.listing.name })}
        onClick={() => props.scope.nav.go({ kind: "agent", listing: props.listing })}
      />
      <span class="simple-market-row-face">
        <AgentAvatar agent={props.listing} motion="hover" />
      </span>
      <div class="simple-market-row-copy">
        <Heading as="h4" size="sm" class="simple-market-row-name" id={id()}>
          {props.listing.name}
        </Heading>
        <Text as="p" variant="body-sm" tone="muted" class="simple-market-row-text">
          {props.listing.description}
        </Text>
      </div>
      <div class="simple-market-row-action">
        <AgentState scope={props.scope} listing={props.listing} onAdded={() => hit?.focus()} />
      </div>
    </article>
  );
}

/**
 * The Agents tab of the simple layout: the most installed agents as cards, then every agent in a
 * two-column list. A search or a filter shows its matches in the list alone.
 */
export function SimpleAgentHome(props: {
  scope: MarketplaceScope;
  items: readonly MarketplaceAgentSummary[];
  /** True while a search or a filter narrows the list. */
  narrowed: boolean;
}) {
  const { t } = useText();
  const [expanded, setExpanded] = createSignal(false);
  const featured = () =>
    props.narrowed ? [] : [...props.items].sort((a, b) => b.installs - a.installs).slice(0, FEATURED_LIMIT);
  const rest = () => props.items.filter((item) => !featured().includes(item));
  const shown = () => (props.narrowed || expanded() ? rest() : rest().slice(0, LIST_LIMIT));
  return (
    <div class="simple-market-home">
      <Show when={featured().length > 0}>
        <section class="simple-market-section" aria-labelledby="simple-market-featured-heading">
          <h3 id="simple-market-featured-heading">{t("simple.market.mostInstalled")}</h3>
          <div class="simple-market-features">
            <For each={featured()}>{(listing) => <FeaturedAgent scope={props.scope} listing={listing} />}</For>
          </div>
        </section>
      </Show>
      <Show when={rest().length > 0}>
        <section class="simple-market-section" aria-labelledby="simple-market-list-heading">
          <div class="simple-market-section-head">
            <h3 id="simple-market-list-heading">{t("simple.market.allAgents")}</h3>
            <Show when={!props.narrowed && rest().length > LIST_LIMIT}>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                class="simple-market-view-all"
                aria-expanded={expanded() ? "true" : "false"}
                onClick={() => setExpanded((value) => !value)}
              >
                {expanded() ? t("simple.market.showLess") : t("simple.market.viewAll")}
              </Button>
            </Show>
          </div>
          <div class="simple-market-rows">
            <For each={shown()}>{(listing) => <AgentRow scope={props.scope} listing={listing} />}</For>
          </div>
        </section>
      </Show>
    </div>
  );
}
