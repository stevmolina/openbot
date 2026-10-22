import { isAgentProvider } from "@openbot/contracts/agent-providers";
import { isAgentModel } from "@openbot/contracts/ipc";
import type { RecentModelChoice } from "@openbot/ui/components/ProviderModelPicker";
import { createEffect, createSignal } from "solid-js";
import { z } from "zod";

/**
 * The models that this computer's agents ran last, newest first, for the "Recent" view of the model
 * picker. Only this renderer reads them, so they stay in `localStorage`, as the simple layout choice
 * does. A blocked or full storage keeps the list for this page only.
 */
const RECENT_MODELS_STORAGE_KEY = "openbot:recent-models";
const MAX_RECENT_MODELS = 8;
const MAX_ID_LENGTH = 256;

const storedChoicesSchema = z.array(
  z.object({
    provider: z.string(),
    model: z.string(),
    accountId: z.string().max(MAX_ID_LENGTH).nullish(),
  }),
);

function readRecentModels(): RecentModelChoice[] {
  try {
    const parsed = storedChoicesSchema.safeParse(
      JSON.parse(window.localStorage.getItem(RECENT_MODELS_STORAGE_KEY) ?? "[]"),
    );
    if (!parsed.success) return [];
    // A provider or a model id that this build does not know is left out, not shown.
    return parsed.data
      .flatMap(({ provider, model, accountId }): RecentModelChoice[] =>
        isAgentProvider(provider) && isAgentModel(model) ? [{ provider, model, accountId: accountId ?? null }] : [],
      )
      .slice(0, MAX_RECENT_MODELS);
  } catch {
    return [];
  }
}

const [recentModels, setRecentModels] = createSignal<readonly RecentModelChoice[]>(readRecentModels());

const sameChoice = (left: RecentModelChoice, right: RecentModelChoice): boolean =>
  left.provider === right.provider &&
  left.model === right.model &&
  (left.accountId ?? null) === (right.accountId ?? null);

function rememberModel(choice: RecentModelChoice): void {
  const current = recentModels();
  const first = current[0];
  if (first && sameChoice(first, choice)) return;
  const next = [choice, ...current.filter((item) => !sameChoice(item, choice))].slice(0, MAX_RECENT_MODELS);
  setRecentModels(next);
  try {
    window.localStorage.setItem(RECENT_MODELS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // The list stays for this page only.
  }
}

/** Puts the model that an agent runs at the top of the recent list each time it changes. */
export function trackRecentModel(choice: () => RecentModelChoice | undefined): void {
  createEffect(choice, (value) => {
    if (value) rememberModel(value);
  });
}

export { recentModels };
