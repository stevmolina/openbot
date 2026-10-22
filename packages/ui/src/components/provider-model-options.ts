import type { AgentProviderId, ClientAgentModelOption, CustomProviderSummary } from "@openbot/contracts/ipc";
import {
  agentProviderName,
  CUSTOM_AGENT_DEFAULT_MODEL,
  isAgentProvider,
  isCustomProviderModelId,
  isFreeOpencodeModel,
  isKnownAgentProvider,
} from "@openbot/contracts/ipc";
import type { AppTextKey } from "@openbot/i18n";
import { currentText } from "../text";

/** The efforts that have a name in the catalog. The other efforts show their id. */
const EFFORT_LABELS: Partial<Record<string, AppTextKey>> = {
  low: "provider.effort.low",
  medium: "provider.effort.medium",
  high: "provider.effort.high",
  xhigh: "provider.effort.xhigh",
  max: "provider.effort.max",
};

export interface PickerModel {
  id: string;
  /** The wire provider: the Custom tab holds both `opencode` endpoints and `acp` agents. */
  provider: AgentProviderId;
  name: string;
  /** The one line that the provider or the catalog gives for the model. It can be empty. */
  description: string;
  service: string;
  free: boolean;
  variants: { id: string; name: string }[];
}

/**
 * Whether a model's description earns its line. Text that the app wrote when it found the model, or
 * text that every model of the provider shares, does not tell the models apart, so it stays hidden.
 */
export function hasSpecificDescription(model: PickerModel, peers: readonly PickerModel[]): boolean {
  const value = model.description.trim();
  if (!value || /\bdiscovered from\b/i.test(value)) return false;
  return peers.length < 2 || peers.some((peer) => peer.description.trim() !== value);
}

export interface PickerModelGroup {
  name: string;
  models: PickerModel[];
}

/**
 * How a provider id inside a custom agent reads in a group heading. An id that is also an OpenBot
 * provider takes its display name; a few other well-known ids keep their brand casing here; any
 * other id falls back to one capitalized word per `-`, `_` or space.
 */
const KNOWN_PROVIDER_LABELS: Record<string, string> = {
  chatgpt: "ChatGPT",
  deepseek: "DeepSeek",
  devin: "Devin",
  gemini: "Gemini",
  github: "GitHub",
  "github-copilot": "GitHub Copilot",
  openai: "OpenAI",
  openrouter: "OpenRouter",
};

function providerLabel(id: string): string {
  const lower = id.toLowerCase();
  const known = KNOWN_PROVIDER_LABELS[lower];
  if (known) return known;
  if (isAgentProvider(lower)) return agentProviderName(lower);
  return id
    .replace(/[-_\s]+(.)?/g, (_match, letter: string) => (letter ? ` ${letter.toUpperCase()}` : ""))
    .replace(/^./, (letter) => letter.toUpperCase());
}

/** `Agent/provider` group keys read `Agent · Provider`; a bare service stays as the agent named it. */
function groupLabel(service: string): string {
  const separator = service.lastIndexOf("/");
  if (separator < 0) return service;
  return `${service.slice(0, separator)} · ${providerLabel(service.slice(separator + 1))}`;
}

/** Free tier first; id says nothing about locality. */
function modelTier(model: PickerModel): 0 | 1 {
  return model.free ? 0 : 1;
}

/** OpenCode exposes reasoning variants as model IDs. Keep those IDs at the selection boundary. */
export function pickerModels(options: ClientAgentModelOption[]): PickerModel[] {
  const { t } = currentText();
  const byId = new Map(options.map((model) => [model.id, model]));
  const variants = new Map<string, { id: string; name: string }[]>();
  const variantIds = new Set<string>();
  for (const model of options) {
    if (model.provider !== "opencode") continue;
    const match = /^(.*)\/(none|minimal|low|medium|high|xhigh|max|ultra)$/.exec(model.id);
    const [, baseId, effort] = match ?? [];
    const base = baseId === undefined ? undefined : byId.get(baseId);
    if (!base || effort === undefined || model.name !== `${base.name} (${effort})`) continue;
    const label = EFFORT_LABELS[effort];
    const name = label ? t(label) : effort.charAt(0).toUpperCase() + effort.slice(1);
    variants.set(base.id, [...(variants.get(base.id) ?? []), { id: model.id, name }]);
    variantIds.add(model.id);
  }
  // A model of a provider that this build does not know has no tab here; the picker shows it alone.
  return options
    .filter((model) => !variantIds.has(model.id))
    .flatMap((model) => {
      if (!isKnownAgentProvider(model.provider)) return [];
      // A custom agent that lists no models has one, named for the agent alone.
      if (
        model.provider === "acp" &&
        model.id.endsWith(`/${CUSTOM_AGENT_DEFAULT_MODEL}`) &&
        !model.name.includes("/")
      ) {
        return {
          id: model.id,
          provider: model.provider,
          name: t("app.modelVariant.default"),
          description: "",
          service: model.name,
          free: false,
          variants: [],
        };
      }
      // OpenCode and custom agent models are named `<service>/<model>`; the service is the group.
      const separator = model.provider === "opencode" || model.provider === "acp" ? model.name.indexOf("/") : -1;
      let service = separator < 0 ? "" : model.name.slice(0, separator);
      let name = separator < 0 ? model.name : model.name.slice(separator + 1);
      // A custom agent can serve several providers. Its id holds them as `<agent>/<provider>/<model>`
      // even when its display name does not, so the provider segment of the id is the group.
      if (model.provider === "acp") {
        const idSeparator = model.id.indexOf("/");
        const innerId = idSeparator < 0 ? "" : model.id.slice(idSeparator + 1);
        const providerEnd = innerId.indexOf("/");
        const provider = providerEnd < 0 ? "" : innerId.slice(0, providerEnd);
        if (provider) service = `${service}/${provider}`;
        const inner = name.indexOf("/");
        if (inner >= 0 && (!provider || name.slice(0, inner) === provider)) name = name.slice(inner + 1);
      }
      name = name.replace(/^[\s:–—-]+/, "") || model.id;
      return {
        id: model.id,
        provider: model.provider,
        name,
        description: model.description,
        service,
        // Free-tier label only; shared with catalog order so badge and default agree.
        free: model.provider === "opencode" && isFreeOpencodeModel(model.id, name),
        variants: variants.has(model.id)
          ? [{ id: model.id, name: t("app.modelVariant.default") }, ...(variants.get(model.id) ?? [])]
          : [],
      };
    });
}

/** One group per service, ordered by best tier; tier orders, badge carries pricing. */
export function groupPickerModels(models: PickerModel[], search: string): PickerModelGroup[] {
  const query = search.trim().toLowerCase();
  const groups = new Map<string, PickerModelGroup>();
  const tiers = new Map<string, number>();
  for (const model of models) {
    if (!`${model.service} ${model.name} ${model.id}`.toLowerCase().includes(query)) continue;
    const name = model.provider === "acp" ? groupLabel(model.service) : model.service;
    const group = groups.get(model.service) ?? { name, models: [] };
    group.models.push(model);
    groups.set(model.service, group);
    tiers.set(model.service, Math.min(tiers.get(model.service) ?? modelTier(model), modelTier(model)));
  }
  for (const group of groups.values()) group.models.sort((left, right) => modelTier(left) - modelTier(right));
  // Tiers are keyed by service: an ACP group name is a label that differs from its key.
  return [...groups.entries()]
    .sort(([left], [right]) => (tiers.get(left) ?? 0) - (tiers.get(right) ?? 0))
    .map(([, group]) => group);
}

/** The family of a model and its version, as the model name gives them. */
interface ModelLineage {
  family: string;
  version: number[];
}

/**
 * The first version number of a name, as a whole word: `5.5`, `V2.6`, or `4-6` in an id-shaped name.
 * A number glued to letters, such as `Qwen3`, `4o` or `30B`, is part of a word and not a version.
 */
const VERSION_PATTERN = /(?<![\p{L}\p{N}])v?(\d+(?:[.-]\d+)*)(?![\p{L}\p{N}])/iu;

/**
 * The family and version of a model, read from its name: `claude opus` at 5.5 for `Claude Opus 5.5`,
 * and `gpt luna` at 6 for `GPT-6 Luna`. The catalog gives no release date and no family, and it sorts
 * by the first version number of the name, so the picker reads the same number. The other words,
 * sizes such as `30B` and tags such as `(1M context)` too, are the family. A name with no version
 * number has no lineage.
 */
export function modelLineage(name: string): ModelLineage | null {
  const match = VERSION_PATTERN.exec(name);
  const digits = match?.[1];
  if (!match || digits === undefined) return null;
  const rest = `${name.slice(0, match.index)} ${name.slice(match.index + match[0].length)}`;
  const family = rest
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .join(" ");
  return family ? { family, version: digits.split(/[.-]/u).map(Number) } : null;
}

/** Newer first: a positive value when `left` is the older version. A missing part counts as 0. */
function compareVersions(left: readonly number[], right: readonly number[]): number {
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const difference = (right[index] ?? 0) - (left[index] ?? 0);
    if (difference) return difference;
  }
  return 0;
}

/**
 * The models that have a newer model of the same family in the list: `Claude Opus 5` beside
 * `Claude Opus 5.5`. Each provider and each service of a catalog has its own families. All models of
 * the newest version of a family stay, and a model with no lineage is never older.
 */
export function olderPickerModels(models: readonly PickerModel[]): ReadonlySet<PickerModel> {
  const newest = new Map<string, number[]>();
  const lineages = models.map((model) => {
    const lineage = modelLineage(model.name);
    if (!lineage) return null;
    const key = `${model.provider}\n${model.service}\n${lineage.family}`;
    const best = newest.get(key);
    if (!best || compareVersions(lineage.version, best) < 0) newest.set(key, lineage.version);
    return { key, version: lineage.version };
  });
  return new Set(
    models.filter((_model, index) => {
      const lineage = lineages[index];
      const best = lineage && newest.get(lineage.key);
      return Boolean(lineage && best && compareVersions(lineage.version, best) > 0);
    }),
  );
}

export function customProviderIds(providers: readonly CustomProviderSummary[]): ReadonlySet<string> {
  return new Set(providers.map((provider) => provider.id));
}

/** A model of the Custom tab: a custom endpoint's, which OpenCode serves, or a custom agent's. */
export function isCustomModel(model: ClientAgentModelOption, customIds: ReadonlySet<string>): boolean {
  return model.provider === "acp" || (model.provider === "opencode" && isCustomProviderModelId(model.id, customIds));
}
