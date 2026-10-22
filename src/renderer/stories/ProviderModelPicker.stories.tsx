import type { AgentModelId, AgentProviderId, AgentReasoningEffort } from "@openbot/contracts/ipc";
import { ProviderModelPicker } from "@openbot/ui/components/ProviderModelPicker";
import { createStore } from "solid-js";
import { fn } from "storybook/test";
import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { STORY_AGENT_STATUS, STORY_MODELS } from "./fixtures";

const args: Parameters<typeof ProviderModelPicker>[0] = {
  provider: "codex",
  value: "gpt-5.6-luna",
  modelOptions: STORY_MODELS,
  agentStatus: STORY_AGENT_STATUS,
  onChange: fn(),
};

const meta = {
  title: "Conversation/ProviderModelPicker",
  component: ProviderModelPicker,
  args,
  parameters: { layout: "centered" },
} satisfies Meta<typeof ProviderModelPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Pill: Story = {
  args: { reasoningEffort: "medium", onReasoningEffortChange: fn() },
};

/** The quiet chip next to Send in the simple layout. The panel opens above it. */
export const Composer: Story = {
  args: {
    variant: "composer",
    placement: "top-end",
    reasoningEffort: "high",
    onReasoningEffortChange: fn(),
    onManageProviders: fn(),
  },
};

/** Two or more models chosen before add the Recent view at the top of the rail. */
export const RecentModels: Story = {
  args: {
    reasoningEffort: "medium",
    onReasoningEffortChange: fn(),
    recentModels: [
      { provider: "codex", model: "gpt-5.6-luna" },
      { provider: "claude", model: "claude-opus-5-5" },
      { provider: "grok", model: "grok-4.6" },
    ],
  },
};

/**
 * A Codex model with a fast tier. The chosen row holds the lightning, which turns fast mode on or off,
 * and the effort chip, which opens the levels of the model.
 */
export const SpeedControl: Story = {
  args: {
    value: "gpt-5.6-sol",
    reasoningEffort: "medium",
    onReasoningEffortChange: fn(),
    fastMode: true,
    onFastModeChange: fn(),
  },
};

/** Choices apply here: a model, its effort and fast mode change as in the app. */
export const Interactive: Story = {
  render: (storyArgs) => {
    const [choice, setChoice] = createStore<{
      provider: AgentProviderId;
      value: AgentModelId;
      reasoningEffort: AgentReasoningEffort;
      fastMode: boolean;
    }>({ provider: "codex", value: "gpt-5.6-sol", reasoningEffort: "high", fastMode: true });
    return (
      <ProviderModelPicker
        {...storyArgs}
        provider={choice.provider}
        value={choice.value}
        reasoningEffort={choice.reasoningEffort}
        fastMode={choice.fastMode}
        onReasoningEffortChange={(effort) =>
          setChoice((state) => {
            state.reasoningEffort = effort;
          })
        }
        onFastModeChange={(fastMode) =>
          setChoice((state) => {
            state.fastMode = fastMode;
          })
        }
        onChange={(model, provider) =>
          setChoice((state) => {
            // As the app does: an effort that the new model cannot use becomes its default.
            const option = STORY_MODELS.find((candidate) => candidate.provider === provider && candidate.id === model);
            if (option && !option.supportedReasoningEfforts.includes(state.reasoningEffort)) {
              state.reasoningEffort = option.defaultReasoningEffort;
            }
            state.value = model;
            state.provider = provider;
          })
        }
      />
    );
  },
};

/** A Claude model with every effort level in its effort menu. */
export const AllEffortLevels: Story = {
  args: {
    provider: "claude",
    value: "claude-opus-5-5",
    modelOptions: STORY_MODELS.map((model) =>
      model.id === "claude-opus-5-5"
        ? { ...model, supportedReasoningEfforts: ["low", "medium", "high", "xhigh", "max"] }
        : model,
    ),
    reasoningEffort: "high",
    onReasoningEffortChange: fn(),
  },
};

/** A model with one effort only: its row has no effort chip, only the check. */
export const NoEffortChoice: Story = {
  args: {
    provider: "claude",
    value: "claude-haiku-5-5",
    reasoningEffort: "medium",
    onReasoningEffortChange: fn(),
  },
};

export const Field: Story = {
  args: { variant: "field", label: "Model" },
};

export const Disabled: Story = {
  args: { disabled: true, disabledReason: "Choose a provider first." },
};

/** During a turn: the agent's own models and effort stay open, the other providers wait. */
export const DuringTurn: Story = {
  args: {
    reasoningEffort: "medium",
    onReasoningEffortChange: fn(),
    providerChangesDisabled: true,
    disabledReason: "Wait for the current work to finish before changing the provider or account.",
  },
};

export const UnavailableProvidersOpen: Story = {
  args: {
    modelOptions: STORY_MODELS.filter((model) => model.provider === "codex"),
    agentStatus: {
      ...STORY_AGENT_STATUS,
      providers: STORY_AGENT_STATUS.providers?.map((provider) =>
        provider.id === "codex"
          ? provider
          : {
              ...provider,
              state: "not-installed" as const,
              version: null,
              message:
                provider.id === "grok"
                  ? "Run `grok login` or set XAI_API_KEY to use Grok."
                  : "Run `claude auth login` to use Claude.",
            },
      ),
    },
  },
};

/** The conversation picker: signed-out providers sit dimmed after the ready ones, and each offers a way in. */
export const NotConnectedProviders: Story = {
  args: {
    onManageProviders: fn(),
    agentStatus: {
      ...STORY_AGENT_STATUS,
      providers: STORY_AGENT_STATUS.providers?.map((provider) =>
        provider.id === "codex" || provider.id === "claude"
          ? provider
          : { ...provider, state: "sign-in-required" as const },
      ),
    },
  },
};

export const ProviderDownloadsOpen: Story = {
  args: {
    modelOptions: STORY_MODELS.filter((model) => model.provider === "codex"),
    agentStatus: {
      ...STORY_AGENT_STATUS,
      phase: "blocked",
      providers: STORY_AGENT_STATUS.providers?.map((provider) => ({
        ...provider,
        state: "not-installed" as const,
        version: null,
        message: null,
      })),
    },
    runtimeStatuses: {
      codex: { phase: "downloading", progress: 24, message: null, version: null },
      claude: { phase: "downloading", progress: 48, message: null, version: null },
      grok: { phase: "downloading", progress: 72, message: null, version: null },
    },
    onDownloadProvider: fn(),
    onCancelProviderDownload: fn(),
    onConnectProvider: fn(),
  },
};

export const DiscoveredModels: Story = {
  args: {
    modelOptions: [
      ...STORY_MODELS,
      {
        provider: "codex",
        id: "gpt-6-astra",
        name: "GPT-6 Astra",
        description: "Codex model discovered from the local CLI.",
        defaultReasoningEffort: "medium",
        supportedReasoningEfforts: ["low", "medium", "high", "xhigh", "max", "ultra"],
      },
    ],
  },
};

export const OpenCodeCatalog: Story = {
  args: {
    provider: "opencode",
    value: "opencode/example-free/low",
    agentStatus: {
      ...STORY_AGENT_STATUS,
      providers: [{ id: "opencode", state: "available", version: "1.3.13", message: null }],
    },
    modelOptions: [
      ["cerebras/qwen", "Cerebras/Qwen"],
      ["openai/gpt", "OpenAI/GPT"],
      ["opencode/example-free", "OpenCode Zen/Example Free"],
      ["opencode/another-free", "OpenCode Zen/Another Free"],
      ["opencode/example", "OpenCode Zen/Example"],
      ["zai/glm", "Z.AI/GLM"],
    ].flatMap(([id, name]) =>
      ["", "low", "medium", "high", "xhigh"].map((effort) => ({
        provider: "opencode" as const,
        id: effort ? `${id}/${effort}` : id,
        name: effort ? `${name} (${effort})` : name,
        description: "Example model catalog",
        defaultReasoningEffort: "medium" as const,
        supportedReasoningEfforts: ["medium" as const],
      })),
    ),
  },
};

const openCodeCatalog = (entries: [string, string][]) =>
  entries.map(([id, name]) => ({
    provider: "opencode" as const,
    id,
    name,
    description: "Example model catalog",
    defaultReasoningEffort: "medium" as const,
    supportedReasoningEfforts: ["medium" as const],
  }));

export const OpenCodeLocalModels: Story = {
  args: {
    provider: "opencode",
    value: "ollama/qwen3-coder:30b",
    agentStatus: {
      ...STORY_AGENT_STATUS,
      providers: [{ id: "opencode", state: "available", version: "1.3.13", message: null }],
    },
    modelOptions: openCodeCatalog([
      ["ollama/qwen3-coder:30b", "Ollama/Qwen3 Coder 30B"],
      ["ollama/gpt-oss:120b", "Ollama/GPT-OSS 120B"],
      ["lmstudio/glm-5-air", "LM Studio/GLM-5 Air"],
      ["opencode/example-free", "OpenCode Zen/Example Free"],
      ["opencode/example", "OpenCode Zen/Example"],
      ["zai/glm", "Z.AI/GLM"],
      ["openai/gpt", "OpenAI/GPT"],
    ]),
  },
};

/** A long OpenCode catalog: the list has a filter field above it. Each model has effort variants. */
export const OpenCodeManyModels: Story = {
  args: {
    provider: "opencode",
    value: "anthropic/claude-sonnet-5/high",
    agentStatus: {
      ...STORY_AGENT_STATUS,
      providers: [{ id: "opencode", state: "available", version: "1.3.13", message: null }],
    },
    modelOptions: [
      ["anthropic/claude-sonnet-5", "Anthropic/Claude Sonnet 5"],
      ["anthropic/claude-opus-5", "Anthropic/Claude Opus 5"],
      ["anthropic/claude-haiku-5-5", "Anthropic/Claude Haiku 5.5"],
      ["openai/gpt-5.6-sol", "OpenAI/GPT-5.6 Sol"],
      ["openai/gpt-5.6-terra", "OpenAI/GPT-5.6 Terra"],
      ["openai/gpt-5.6-luna", "OpenAI/GPT-5.6 Luna"],
      ["opencode/example-free", "OpenCode Zen/Example Free"],
      ["opencode/another-free", "OpenCode Zen/Another Free"],
      ["opencode/example", "OpenCode Zen/Example"],
      ["google/gemini-3-pro", "Google/Gemini 3 Pro"],
      ["google/gemini-3-flash", "Google/Gemini 3 Flash"],
      ["zai/glm-5", "Z.AI/GLM-5"],
      ["zai/glm-5-air", "Z.AI/GLM-5 Air"],
      ["deepseek/deepseek-v4", "DeepSeek/DeepSeek V4"],
      [
        "openrouter/qwen3-coder-480b-a35b-instruct-long-context",
        "OpenRouter/Qwen3 Coder 480B A35B Instruct Long Context",
      ],
    ].flatMap(([id, name]) =>
      ["", "low", "medium", "high"].map((effort) => ({
        provider: "opencode" as const,
        id: effort ? `${id}/${effort}` : id,
        name: effort ? `${name} (${effort})` : name,
        description: "Example model catalog",
        defaultReasoningEffort: "medium" as const,
        supportedReasoningEfforts: ["medium" as const],
      })),
    ),
  },
};

const openCodeStatus = {
  ...STORY_AGENT_STATUS,
  providers: [{ id: "opencode" as const, state: "available" as const, version: "1.18.27", message: null }],
};

const customProviders = [
  {
    id: "studio-local",
    name: "Studio Local",
    baseUrl: "http://127.0.0.1:11434/v1",
    hasApiKey: false,
    models: [{ id: "qwen3-coder:30b", name: "Qwen3 Coder 30B" }],
  },
  {
    id: "house-router",
    name: "House Router",
    baseUrl: "https://models.example.com/v1",
    hasApiKey: true,
    models: [{ id: "gpt-oss-120b", name: "GPT OSS 120B" }],
  },
];

/** Nothing configured: the Custom tab is the one entry point, so it must not be a dead end. */
export const CustomTabEmpty: Story = {
  args: {
    provider: "opencode",
    value: "opencode/example",
    agentStatus: openCodeStatus,
    modelOptions: openCodeCatalog([["opencode/example", "OpenCode Zen/Example"]]),
    onAddCustomProvider: fn(),
  },
};

export const CustomTabWithModels: Story = {
  args: {
    provider: "opencode",
    value: "studio-local/qwen3-coder:30b",
    agentStatus: openCodeStatus,
    customProviders,
    onAddCustomProvider: fn(),
    modelOptions: openCodeCatalog([
      ["studio-local/qwen3-coder:30b", "Studio Local/Qwen3 Coder 30B"],
      ["studio-local/gpt-oss:120b", "Studio Local/GPT-OSS 120B"],
      ["house-router/glm-5-air", "House Router/GLM-5 Air"],
      ["opencode/example-free", "OpenCode Zen/Example Free"],
      ["openai/gpt", "OpenAI/GPT"],
    ]),
  },
};

/** The same catalog on the OpenCode tab, which must not list the two custom endpoints again. */
export const OpenCodeTabExcludesCustom: Story = {
  args: {
    ...CustomTabWithModels.args,
    value: "opencode/example-free",
  },
};
