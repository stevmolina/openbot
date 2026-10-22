import type { AnalyticsTotals, HostAnalytics } from "@openbot/contracts/ipc";
import type { AppTextKey } from "@openbot/i18n";
import { Button, SlidingTabs } from "@openbot/ui";
import type { JSX } from "@solidjs/web";
import { createMemo, createStore, For, onSettled, Show } from "solid-js";
import { useText } from "../../text";
import { UsageChart } from "./UsageChart";
import { UsageProviderMark } from "./UsageProviderMark";
import {
  type UsageAgentLabel,
  type UsageMetric,
  usageCompact,
  usageCost,
  usageExactCost,
  usageNumber,
  usageProviderName,
  usageProviders,
  usageSeriesColor,
} from "./usage-format";

/** The numbers that the cards leave out, one step down in "More numbers". */
const DETAIL_ROWS = [
  { field: "cachedInput", label: "usage.totals.cachedInput" },
  { field: "uncachedInput", label: "usage.totals.uncachedInput" },
  { field: "cacheCreation", label: "usage.totals.cacheCreation" },
  { field: "output", label: "usage.totals.output" },
  { field: "userMessages", label: "usage.totals.userMessages" },
  { field: "assistantMessages", label: "usage.totals.assistantMessages" },
] as const satisfies ReadonlyArray<{ field: keyof AnalyticsTotals; label: AppTextKey }>;

/** A compact figure for the eye and the exact one for a screen reader. */
function Figure(props: { value: number | null; cost?: boolean }) {
  const text = useText();
  return (
    <>
      <span aria-hidden="true">{props.cost ? usageCost(props.value, text) : usageCompact(props.value, text)}</span>
      <span class="sr-only">{props.cost ? usageExactCost(props.value, text) : usageNumber(props.value, text)}</span>
    </>
  );
}

/**
 * The simple layout's usage report: four number cards, the daily chart in a card, and one clean table
 * by agent, model or day. It reads the same host report as `AgentUsageReport`, and shows every number
 * that report shows, the less common ones under "More numbers".
 */
export function SimpleUsageReport(props: {
  result: HostAnalytics;
  metric: UsageMetric;
  agentLabel: (agentId: string) => UsageAgentLabel;
  /** The control that picks what the chart shows, placed in the chart card's header. */
  chartControl?: JSX.Element;
  onReady: () => void;
}) {
  const text = useText();
  const { t, format } = text;
  onSettled(() => queueMicrotask(props.onReady));
  const [state, setState] = createStore({ breakdown: "agent" });
  const totals = () => props.result.totals;
  const cost = () => props.metric === "cost";
  const partial = () =>
    totals().missingUsageTurns > 0 || totals().unpricedRecords > 0 || totals().incompleteRecords > 0;
  /** The providers that gave no cost, named in the one line that replaces the cost figure. */
  const unpricedProviders = () =>
    usageProviders(props.result.models)
      .filter((provider) => provider.cost === null)
      .map((provider) => usageProviderName(provider.provider));
  /** The chart draws one area per provider, so with several the dots below it name them. */
  const legendProviders = () => usageProviders(props.result.models);
  const messages = () => totals().userMessages + totals().assistantMessages;
  const agents = createMemo(() =>
    [...props.result.agents].sort((a, b) =>
      cost() ? (b.estimatedCostUsd ?? -1) - (a.estimatedCostUsd ?? -1) : b.processedTokens - a.processedTokens,
    ),
  );
  const models = createMemo(() =>
    [...props.result.models].sort((a, b) =>
      cost() ? (b.estimatedCostUsd ?? -1) - (a.estimatedCostUsd ?? -1) : b.processedTokens - a.processedTokens,
    ),
  );
  const hasCost = () => totals().estimatedCostUsd !== null;
  const share = (row: AnalyticsTotals) => {
    const total = cost() ? totals().estimatedCostUsd : totals().processedTokens;
    const amount = cost() ? row.estimatedCostUsd : row.processedTokens;
    return amount === null || total === null
      ? t("usage.unavailable")
      : format.percent(total ? amount / total : 0, { maximumFractionDigits: 0 });
  };
  /** The heading follows the tab that is open. */
  const breakdownHeading = () =>
    state.breakdown === "model"
      ? t("simple.usage.byModel")
      : state.breakdown === "day"
        ? t("simple.usage.byDay")
        : t("simple.usage.byAgent");
  let dailyTable: HTMLTableElement | undefined;
  const showDailyData = () => {
    setState((draft) => {
      draft.breakdown = "day";
    });
    queueMicrotask(() => dailyTable?.focus());
  };
  const rowCells = (row: AnalyticsTotals) => (
    <>
      <td>
        <Figure value={row.processedTokens} />
      </td>
      <Show when={hasCost()}>
        <td>
          <Figure value={row.estimatedCostUsd} cost />
        </td>
      </Show>
      <td>{share(row)}</td>
    </>
  );
  return (
    <>
      <Show when={!totals().turns && !totals().userMessages && !totals().processedTokens}>
        <p class="agent-usage-notice" role="status">
          {t("usage.empty")}
        </p>
      </Show>
      <Show when={partial()}>
        <p class="agent-usage-notice" role="status">
          {t("usage.partial", {
            turns: totals().missingUsageTurns,
            unpriced: totals().unpricedRecords,
            incomplete: totals().incompleteRecords,
          })}
        </p>
      </Show>
      <section class="simple-usage-cards" aria-label={t("usage.summary")}>
        <div class="simple-usage-card">
          <h3>{t("simple.usage.tokens")}</h3>
          <p>
            <Figure value={totals().processedTokens} />
          </p>
        </div>
        <div class="simple-usage-card">
          <h3>{t("simple.usage.sessions")}</h3>
          <p>
            <Figure value={totals().sessions} />
          </p>
        </div>
        <div class="simple-usage-card">
          <h3>{t("simple.usage.messages")}</h3>
          <p>
            <Figure value={messages()} />
          </p>
        </div>
        <div class="simple-usage-card">
          <h3>{t("simple.usage.cost")}</h3>
          <Show
            when={hasCost()}
            fallback={
              <p class="simple-usage-card-note">
                {unpricedProviders().length > 0
                  ? t("simple.usage.notReportedBy", { provider: unpricedProviders().join(", ") })
                  : t("simple.usage.notReported")}
              </p>
            }
          >
            <p>
              <Figure value={totals().estimatedCostUsd} cost />
            </p>
          </Show>
        </div>
      </section>
      <section class="simple-usage-panel" aria-label={t("usage.dailyTrend")}>
        <div class="simple-usage-panel-header">
          <h3>{cost() ? t("simple.usage.costPerDay") : t("simple.usage.tokensPerDay")}</h3>
          <div class="simple-usage-panel-actions">
            {props.chartControl}
            <Button variant="ghost" size="xs" onClick={showDailyData}>
              {t("usage.viewDailyData")}
            </Button>
          </div>
        </div>
        <UsageChart result={props.result} metric={props.metric} />
        <Show when={legendProviders().length > 1}>
          <div class="simple-usage-legend">
            <For each={legendProviders()}>
              {(provider) => (
                <span>
                  <span
                    class="agent-usage-series-dot"
                    style={{ background: usageSeriesColor(provider.provider) }}
                    aria-hidden="true"
                  />
                  <UsageProviderMark provider={provider.provider} />
                  {usageProviderName(provider.provider)}
                </span>
              )}
            </For>
          </div>
        </Show>
      </section>
      <SlidingTabs.Root
        value={state.breakdown}
        onChange={(value) =>
          setState((draft) => {
            draft.breakdown = value;
          })
        }
      >
        <div class="agent-usage-section-header">
          <h3>{breakdownHeading()}</h3>
          <SlidingTabs.List aria-label={t("usage.breakdown.label")}>
            <SlidingTabs.Trigger value="agent">{t("usage.breakdown.agent")}</SlidingTabs.Trigger>
            <SlidingTabs.Trigger value="model">{t("usage.breakdown.model")}</SlidingTabs.Trigger>
            <SlidingTabs.Trigger value="day">{t("usage.breakdown.day")}</SlidingTabs.Trigger>
          </SlidingTabs.List>
        </div>
        <SlidingTabs.ContentSlot>
          <SlidingTabs.Content value="agent">
            <div class="simple-usage-table">
              <table>
                <caption class="sr-only">{t("usage.breakdown.byAgent")}</caption>
                <thead>
                  <tr>
                    <th scope="col">{t("usage.breakdown.agent")}</th>
                    <th scope="col">{t("simple.usage.runsOn")}</th>
                    <th scope="col">{t("usage.column.tokens")}</th>
                    <Show when={hasCost()}>
                      <th scope="col">{t("usage.column.cost")}</th>
                    </Show>
                    <th scope="col">{t("usage.column.share")}</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={agents()}>
                    {(agent) => (
                      <tr>
                        <th scope="row">{props.agentLabel(agent.agentId).name}</th>
                        <td>{usageProviderName(props.agentLabel(agent.agentId).provider)}</td>
                        {rowCells(agent)}
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </SlidingTabs.Content>
          <SlidingTabs.Content value="model">
            <div class="simple-usage-table">
              <table>
                <caption class="sr-only">{t("usage.breakdown.byModel")}</caption>
                <thead>
                  <tr>
                    <th scope="col">{t("usage.breakdown.model")}</th>
                    <th scope="col">{t("simple.usage.runsOn")}</th>
                    <th scope="col">{t("usage.column.tokens")}</th>
                    <Show when={hasCost()}>
                      <th scope="col">{t("usage.column.cost")}</th>
                    </Show>
                    <th scope="col">{t("usage.column.share")}</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={models()}>
                    {(model) => (
                      <tr>
                        <th scope="row">{model.model || t("usage.unknownModel")}</th>
                        <td>{usageProviderName(model.provider)}</td>
                        {rowCells(model)}
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </SlidingTabs.Content>
          <SlidingTabs.Content value="day">
            <div class="simple-usage-table">
              <table ref={dailyTable} tabindex={-1}>
                <caption class="sr-only">{t("usage.breakdown.byDay")}</caption>
                <thead>
                  <tr>
                    <th scope="col">{t("usage.column.date")}</th>
                    <th scope="col">{t("usage.column.costUsd")}</th>
                    <th scope="col">{t("usage.totals.processedTokens")}</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={[...props.result.daily].reverse()}>
                    {(day) => (
                      <tr>
                        <th scope="row">{day.date}</th>
                        <td>{usageExactCost(day.estimatedCostUsd, text)}</td>
                        <td>{usageNumber(day.processedTokens, text)}</td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </SlidingTabs.Content>
        </SlidingTabs.ContentSlot>
      </SlidingTabs.Root>
      <footer class="agent-usage-footer">
        <details>
          <summary>{t("simple.usage.moreNumbers")}</summary>
          <dl class="simple-usage-details">
            <For each={DETAIL_ROWS}>
              {(item) => (
                <div>
                  <dt>{t(item.label)}</dt>
                  <dd>
                    <Figure value={totals()[item.field]} />
                  </dd>
                </div>
              )}
            </For>
          </dl>
        </details>
        <p>
          {t("usage.footer", {
            started: format.date(new Date(props.result.collectionStartedAt)),
            updated: props.result.updatedAt
              ? format.date(new Date(props.result.updatedAt), {
                  year: "numeric",
                  month: "numeric",
                  day: "numeric",
                  hour: "numeric",
                  minute: "numeric",
                  second: "numeric",
                })
              : t("usage.updatedNever"),
          })}
        </p>
        <details>
          <summary>{t("usage.about.title")}</summary>
          <p>{t("usage.about.body")}</p>
        </details>
      </footer>
    </>
  );
}
