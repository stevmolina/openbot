import { agentAutomationAllowed, type FilePreview } from "@openbot/contracts/ipc";
import { BookMarked, CalendarClock, Folder, Gauge, Globe2, Puzzle, Table2, Upload } from "@openbot/ui";
import { SettingsLinkGroup, SettingsLinkRow } from "@openbot/ui/components/SettingsPanel";
import type { AgentProfile } from "@openbot/ui/data";
import {
  AgentSessionSettings,
  type AgentSessionSettingsApi,
} from "@openbot/ui/features/conversation/AgentSessionSettings";
import SharedAgentSettingsPanel, {
  type AgentSettingsPanelProps as SharedAgentSettingsPanelProps,
  type SimpleAgentPanelSlots,
  type SimpleAgentRoutineRow,
} from "@openbot/ui/features/conversation/AgentSettingsPanel";
import { agentFilesLinkValue } from "@openbot/ui/features/files/AgentFilesView";
import { useText } from "@openbot/ui/text";
import { createEffect, createMemo, createSignal, createStore, Show, untrack } from "solid-js";
import { createSettingsPanelWidth, saveSettingsPanelWidth } from "../../components/settings-panel-width";
import { simpleLayout } from "../../simple-layout";
import { agentSkillCalls, skillsPort } from "../../skills-port";
import { type AgentFilesOptions, AgentFilesSettings } from "../files/AgentFilesSettings";
import { createStorageUsage } from "../files/storage-usage";
import { AgentMemoriesModal } from "./AgentMemoriesModal";
import { AgentRoutinesSettings, type RoutineSelectionRequest } from "./AgentRoutinesSettings";
import { AgentSkillsModal, type AgentSkillsMode, assignedSkillCount, type SkillDetail } from "./AgentSkillsModal";
import { conversationPort, type SharedTableCalls } from "./conversation-port";
import type { ConversationRuntime } from "./conversation-runtime";
import { agentMemoriesPort } from "./memories-port";
import { isEventRoutine, routineListSummary } from "./routine-summary";
import type { EventRoutinesApi } from "./routine-webhooks-api";
import { agentRoutinesPort, eventRoutinesPort, type RoutineEditorRecord, type RoutinesPort } from "./routines-port";
import { SharedTablesModal } from "./SharedTablesModal";

interface AgentSettingsPanelProps
  extends Omit<
    SharedAgentSettingsPanelProps,
    "width" | "onResize" | "onResizeEnd" | "links" | "detailOpen" | "children" | "simple"
  > {
  /** Opens the browser pane of the side panel, for the Computer tab of the simple layout. */
  onOpenBrowser?: (() => void) | undefined;
  remoteClient?: boolean;
  /** Routines can copy local run commands only on the computer that runs the agent. */
  localHost?: boolean;
  sessionSettingsEditable?: boolean;
  /** The memory cap of an agent on this computer. Absent for a remote agent: its host enforces its own. */
  memoryLimit?: number | undefined;
  /** The web client's host calls for the settings that its server supports. */
  adminCalls?: ConversationRuntime["admin"] | undefined;
  onPublish?: (() => void) | undefined;
  onOpenUsage?: ((trigger: HTMLButtonElement) => void) | undefined;
  onWidthChange: (width: number) => void;
  skillSelectionRequest?: { skillId: string } | null | undefined;
  routineSelectionRequest?: RoutineSelectionRequest | null | undefined;
  onRoutineSelectionRequestHandled?: ((nonce: number) => void) | undefined;
  onOpenRoutineRun?: ((messageId: string) => void) | undefined;
  skillsMode?: AgentSkillsMode | undefined;
  /** The joined server that runs the agent, for the `host` skills mode. */
  skillsServerId?: string | undefined;
  skillsMarketplaceOpen?: boolean | undefined;
  /** Another page of the window covers the conversation. */
  workspaceCovered?: boolean | undefined;
  /** The shared data lives on the computer that runs the agents. A joined server shows it to an admin only. */
  tablesVisible?: boolean | undefined;
  /** Names the agent that keeps each set of records. Threaded like `customProviders`, for the same reason. */
  agents?: readonly AgentProfile[] | undefined;
  /** Event routine calls for a host that advertises `events-v1`; absent keeps the released schedule API. */
  eventRoutines?: EventRoutinesApi | undefined;
  onCreateSkill?: (() => void) | undefined;
  onTrySkill?: ((skill: SkillDetail) => void) | undefined;
  /** Reads a file in the agent workspace, on the computer that runs the agent. */
  previewWorkspaceFile?: ((path: string) => Promise<FilePreview>) | undefined;
  onAddFromMarketplace?: ((agentId: string) => void) | undefined;
  /** The Files row. Left out for a remote server without `storage-v1`. */
  files?: AgentFilesOptions | undefined;
}

export type { AgentSkillsMode };

/** How far ahead the Routines card of the simple layout looks for each routine's next run. */
const ROUTINE_ROWS_RANGE_MS = 8 * 24 * 60 * 60 * 1000;

export default function AgentSettingsPanel(props: AgentSettingsPanelProps) {
  const text = useText();
  const { t } = text;
  const sessionSettings = createMemo((): AgentSessionSettingsApi | undefined => {
    if (!props.sessionSettingsEditable) return undefined;
    if (props.remoteClient) return props.adminCalls?.sessionSettings;
    const serverId = props.skillsServerId;
    const api = conversationPort().agent;
    return {
      read: (agentId) => api.readAgentSessionSettings(agentId, serverId),
      set: (input) => api.setAgentSessionSetting(input, serverId),
      reset: (input) => api.resetAgentSessionSetting(input, serverId),
      subscribe: (agentId, listener) =>
        api.onScopedEvent((scoped) => {
          if (
            scoped.serverId === serverId &&
            scoped.event.type === "agent-session-settings-changed" &&
            scoped.event.agentId === agentId
          )
            listener();
        }),
    };
  });
  const [panelWidth, setPanelWidth] = createSettingsPanelWidth();
  const routineRowsAtStart: SimpleAgentRoutineRow[] = [];
  const [draft, setDraft] = createStore({
    tables: { count: 0, open: false },
    memories: { count: 0, open: false },
    routines: { count: 0, open: false, rows: routineRowsAtStart },
    files: { open: false },
    skills: { count: 0, open: false, reopenAfterMarketplace: false },
  });
  const memoriesPort = createMemo(() => agentMemoriesPort(props.agent.id, props.agent.name, props.memoryLimit ?? null));
  const legacyRoutinesPort = createMemo(() =>
    agentRoutinesPort(
      props.agent.id,
      props.localHost === true && agentAutomationAllowed(props.agent),
      // Set only for the host on this computer, the one place the policy is kept.
      props.localHost === true,
    ),
  );
  const routinesPort = createMemo(() => {
    const eventApi = props.eventRoutines ?? props.adminCalls?.eventRoutines;
    return eventApi
      ? eventRoutinesPort({ kind: "agent", id: props.agent.id }, eventApi, legacyRoutinesPort())
      : legacyRoutinesPort();
  });
  const skillsMode = () => props.skillsMode ?? "mutable";
  const tableCalls = (): SharedTableCalls => props.adminCalls?.sharedTables ?? conversationPort().agent;
  const skillCalls = () =>
    props.adminCalls?.skills ?? agentSkillCalls(skillsMode() === "host" ? props.skillsServerId : undefined);
  const storage = createStorageUsage(() => {
    const files = props.files;
    return files ? { serverId: files.serverId, input: { scope: "agent", agentId: props.agent.id } } : null;
  });
  let lastSkillsMarketplaceOpen = untrack(() => props.skillsMarketplaceOpen === true);
  createEffect(
    () => panelWidth(),
    (width) => {
      props.onWidthChange(width);
    },
  );

  // An effect runs again for an equal value, and each activity of the agent gives a new agent
  // object. The memo keeps an open view, such as a routine edit, until the agent changes.
  const currentAgentId = createMemo(() => props.agent.id);
  createEffect(currentAgentId, (agentId) => {
    setDraft((state) => {
      state.tables.open = false;
      state.memories.open = false;
      state.routines.open = false;
      state.routines.rows = [];
      state.files.open = false;
      state.skills.open = false;
      state.skills.reopenAfterMarketplace = false;
    });
    if (untrack(() => !props.remoteClient || props.tablesVisible !== false)) {
      void tableCalls()
        .listTables()
        .catch(() => [])
        .then((items) => {
          setDraft((state) => {
            state.tables.count = items.length;
          });
        });
    }
    void untrack(() => loadSkillsCount(agentId));
    if (!props.remoteClient) {
      loadMemoriesCount(agentId);
      untrack(() => loadRoutinesCount(routinesPort()));
    }
  });

  // The counts follow a memory or routine change, also one that the agent makes in a turn.
  createEffect(
    () => (props.remoteClient ? null : ([currentAgentId(), memoriesPort(), routinesPort()] as const)),
    (sources) => {
      if (!sources) return;
      const [agentId, memories, routines] = sources;
      const stopMemories = memories.subscribe(() => loadMemoriesCount(agentId));
      const stopRoutines = routines.subscribe(() => loadRoutinesCount(routines));
      return () => {
        stopMemories();
        stopRoutines();
      };
    },
  );

  function loadMemoriesCount(agentId: string): void {
    void conversationPort()
      .agent.listMemories(agentId)
      .catch(() => [])
      .then((items) => {
        setDraft((state) => {
          state.memories.count = items.length;
        });
      });
  }

  // Each load takes a number. A slow answer for an older load must not replace a newer one, or a deleted
  // routine would show again.
  let routinesRequest = 0;
  function loadRoutinesCount(port: RoutinesPort): void {
    const request = ++routinesRequest;
    const stale = () => request !== routinesRequest;
    void port
      .list()
      .catch(() => [])
      .then(async (items) => {
        if (stale()) return;
        setDraft((state) => {
          state.routines.count = items.length;
        });
        if (!untrack(simpleLayout)) return;
        const rows = await routineRows(items);
        if (stale() || port.ownerId !== untrack(() => props.agent.id)) return;
        setDraft((state) => {
          state.routines.rows = rows;
        });
      });
  }

  /**
   * The Routines card of the simple layout: each routine with its next run in the coming week, from
   * the host's routine calendar. A routine with no run in that week shows its schedule instead.
   */
  async function routineRows(items: RoutineEditorRecord[]): Promise<SimpleAgentRoutineRow[]> {
    const now = new Date();
    const nextRuns = new Map<string, string>();
    const serverId = untrack(() => props.skillsServerId);
    if (serverId && items.length > 0) {
      const to = new Date(now.getTime() + ROUTINE_ROWS_RANGE_MS);
      const calendar = await conversationPort()
        .agent.routineCalendar({ from: now.toISOString(), to: to.toISOString() }, serverId)
        .catch(() => null);
      for (const run of calendar?.runs ?? []) {
        if (run.status !== "scheduled" || Date.parse(run.at) < now.getTime()) continue;
        const known = nextRuns.get(run.routineId);
        if (!known || Date.parse(run.at) < Date.parse(known)) nextRuns.set(run.routineId, run.at);
      }
    }
    return items.map((routine) => {
      const next = nextRuns.get(routine.id);
      const paused = !isEventRoutine(routine) && !routine.active;
      return {
        id: routine.id,
        name: routine.name,
        when: next
          ? text.format.date(new Date(next), { weekday: "short", hour: "numeric", minute: "2-digit" })
          : paused
            ? t("routine.settings.paused")
            : routineListSummary(routine, text),
      };
    });
  }

  // The Routines card asks for its rows when the simple layout is turned on while the panel shows.
  let lastSimpleLayout = untrack(simpleLayout);
  createEffect(simpleLayout, (on) => {
    if (on && !lastSimpleLayout && untrack(() => !props.remoteClient)) loadRoutinesCount(untrack(routinesPort));
    lastSimpleLayout = on;
  });

  // The count follows a skill change made anywhere, as the dialog does.
  createEffect(
    () => [props.agent.id, skillsMode(), skillCalls()] as const,
    ([agentId, mode, calls]) => {
      if (mode === "hidden" || !calls.onChanged) return;
      return calls.onChanged((changedId) => {
        if (changedId === agentId) void loadSkillsCount(agentId);
      });
    },
  );

  async function loadSkillsCount(agentId: string): Promise<void> {
    if (skillsMode() === "hidden") {
      setDraft((state) => {
        state.skills.count = 0;
      });
      return;
    }
    try {
      const items =
        skillsMode() === "readonly"
          ? await skillsPort().agent.listInstalledSkills(agentId)
          : await skillCalls().listInstalled(agentId);
      setDraft((state) => {
        state.skills.count = assignedSkillCount(items);
      });
    } catch {
      setDraft((state) => {
        state.skills.count = 0;
      });
    }
  }

  createEffect(
    () => props.skillsMarketplaceOpen === true,
    (open) => {
      if (lastSkillsMarketplaceOpen && !open && untrack(() => draft.skills.reopenAfterMarketplace)) {
        // The Marketplace page can close for another page. The skills dialog then stays closed.
        const covered = untrack(() => props.workspaceCovered === true);
        setDraft((state) => {
          state.skills.reopenAfterMarketplace = false;
          state.skills.open = !covered;
        });
      }
      lastSkillsMarketplaceOpen = open;
    },
  );

  createEffect(
    () => ({ request: props.routineSelectionRequest, agentId: props.agent.id }),
    ({ request }) => {
      if (request) {
        setDraft((state) => {
          state.routines.open = true;
        });
      }
    },
  );

  // The request stays set after the dialog closes, and it is read again at each activity of the agent.
  // The memo opens the dialog again only for a new request.
  const skillSelectionRequest = createMemo(() => props.skillSelectionRequest);
  createEffect(skillSelectionRequest, (request) => {
    if (request)
      setDraft((state) => {
        state.skills.open = true;
      });
  });

  // A row of the Routines card opens that routine, through the same request a chat card makes.
  // Its numbers are negative so they never meet a request from the conversation.
  const [ownRoutineRequest, setOwnRoutineRequest] = createSignal<RoutineSelectionRequest | null>(null);
  let ownRoutineNonce = 0;

  function openRoutine(routineId: string | null): void {
    const routine = routineId ? draft.routines.rows.find((row) => row.id === routineId) : undefined;
    ownRoutineNonce -= 1;
    setOwnRoutineRequest(routine ? { routineId: routine.id, routineName: routine.name, nonce: ownRoutineNonce } : null);
    setDraft((state) => {
      state.routines.open = true;
    });
  }

  /** Memories, skills, files and tables: the Knows group, and the Library tab of the simple layout. */
  const knowsGroup = (title?: string) => (
    <Show when={!props.remoteClient || skillsMode() !== "hidden" || props.tablesVisible !== false || props.files}>
      <SettingsLinkGroup inset title={title}>
        <Show when={!props.remoteClient}>
          <SettingsLinkRow
            icon={<BookMarked aria-hidden="true" />}
            label={t("agentSettings.links.memories")}
            value={t("agentSettings.links.memoriesCount", { count: draft.memories.count })}
            onClick={() =>
              setDraft((state) => {
                state.memories.open = true;
              })
            }
          />
        </Show>
        <Show when={skillsMode() !== "hidden"}>
          <SettingsLinkRow
            icon={<Puzzle aria-hidden="true" />}
            label={t("agentSettings.links.skills")}
            value={t("agentSettings.links.skillsCount", { count: draft.skills.count })}
            onClick={() =>
              setDraft((state) => {
                state.skills.open = true;
              })
            }
          />
        </Show>
        <Show when={props.files}>
          <SettingsLinkRow
            icon={<Folder aria-hidden="true" />}
            label={t("agentSettings.links.files")}
            value={storage.state.usage ? agentFilesLinkValue(storage.state.usage.breakdown) : undefined}
            onClick={() =>
              setDraft((state) => {
                state.files.open = true;
              })
            }
          />
        </Show>
        <Show when={props.tablesVisible !== false}>
          <SettingsLinkRow
            icon={<Table2 aria-hidden="true" />}
            label={t("agentSettings.links.tables")}
            value={t("agentSettings.links.tablesCount", { count: draft.tables.count })}
            onClick={() =>
              setDraft((state) => {
                state.tables.open = true;
              })
            }
          />
        </Show>
      </SettingsLinkGroup>
    </Show>
  );

  const simpleSlots = (): SimpleAgentPanelSlots | undefined =>
    simpleLayout()
      ? {
          library: () => knowsGroup(),
          computer: () => (
            <Show when={props.onOpenBrowser}>
              {(openBrowser) => (
                <SettingsLinkGroup inset>
                  <SettingsLinkRow
                    icon={<Globe2 aria-hidden="true" />}
                    label={t("conversation.sidePanel.pane.browser")}
                    value={t("common.open")}
                    onClick={() => openBrowser()()}
                  />
                </SettingsLinkGroup>
              )}
            </Show>
          ),
          routines: props.remoteClient ? null : draft.routines.rows,
          onOpenRoutine: (routineId) => openRoutine(routineId),
          onManageRoutines: () => openRoutine(null),
          onShare: props.onPublish,
        }
      : undefined;

  return (
    <SharedAgentSettingsPanel
      {...props}
      width={panelWidth()}
      onResize={setPanelWidth}
      onResizeEnd={saveSettingsPanelWidth}
      detailOpen={draft.routines.open || draft.files.open}
      simple={simpleSlots()}
      links={
        <>
          <Show when={sessionSettings()}>
            {(api) => (
              <AgentSessionSettings
                agentId={props.agent.id}
                providerIdentity={`${props.runtimeSettings.provider}:${props.runtimeSettings.model}`}
                api={api()}
              />
            )}
          </Show>
          {/* The simple layout shows these rows in its Library tab. */}
          {simpleLayout() ? null : knowsGroup(t("agentSettings.groups.knows"))}
          <Show when={!props.remoteClient || props.onPublish}>
            <SettingsLinkGroup inset title={t("agentSettings.groups.does")}>
              <Show when={!props.remoteClient}>
                <SettingsLinkRow
                  icon={<CalendarClock aria-hidden="true" />}
                  label={t("agentSettings.links.routines")}
                  value={t("agentSettings.links.routinesCount", { count: draft.routines.count })}
                  onClick={() =>
                    setDraft((state) => {
                      state.routines.open = true;
                    })
                  }
                />
              </Show>
              <Show when={!props.remoteClient && props.onOpenUsage}>
                <SettingsLinkRow
                  icon={<Gauge aria-hidden="true" />}
                  label={t("agentSettings.links.usage")}
                  onClick={(trigger) => props.onOpenUsage?.(trigger)}
                />
              </Show>
              <Show when={props.onPublish}>
                <SettingsLinkRow
                  icon={<Upload aria-hidden="true" />}
                  label={t("conversation.header.publish")}
                  onClick={() => props.onPublish?.()}
                />
              </Show>
            </SettingsLinkGroup>
          </Show>
        </>
      }
    >
      <Show when={draft.files.open && props.files}>
        {(files) => (
          <AgentFilesSettings
            {...files()}
            agentName={props.agent.name}
            storage={storage}
            onBack={() =>
              setDraft((state) => {
                state.files.open = false;
              })
            }
            onClose={props.onClose}
          />
        )}
      </Show>
      <Show when={draft.routines.open}>
        <div class="agent-routines-overlay">
          <AgentRoutinesSettings
            port={routinesPort()}
            onCountChange={(count) =>
              setDraft((state) => {
                state.routines.count = count;
              })
            }
            onBack={() =>
              setDraft((state) => {
                state.routines.open = false;
              })
            }
            onClose={props.onClose}
            selectionRequest={ownRoutineRequest() ?? props.routineSelectionRequest}
            onSelectionRequestHandled={(nonce) => {
              if (nonce < 0) setOwnRoutineRequest(null);
              else props.onRoutineSelectionRequestHandled?.(nonce);
            }}
            onOpenRun={props.onOpenRoutineRun}
          />
        </div>
      </Show>
      <Show when={props.tablesVisible !== false}>
        <SharedTablesModal
          agents={props.agents ?? []}
          calls={props.adminCalls?.sharedTables}
          open={draft.tables.open}
          onOpenChange={(open) =>
            setDraft((state) => {
              state.tables.open = open;
            })
          }
          onCountChange={(count) =>
            setDraft((state) => {
              state.tables.count = count;
            })
          }
        />
      </Show>
      <AgentMemoriesModal
        port={memoriesPort()}
        open={draft.memories.open}
        onOpenChange={(open) =>
          setDraft((state) => {
            state.memories.open = open;
          })
        }
        onCountChange={(count) =>
          setDraft((state) => {
            state.memories.count = count;
          })
        }
      />
      <Show when={skillsMode() !== "hidden"}>
        <AgentSkillsModal
          selectionRequest={props.skillSelectionRequest}
          agentId={props.agent.id}
          agentName={props.agent.name}
          open={draft.skills.open}
          skillsMode={skillsMode()}
          serverId={props.skillsServerId}
          calls={props.adminCalls?.skills}
          catalog={props.remoteClient ? null : undefined}
          onCreateSkill={props.onCreateSkill}
          onTrySkill={props.onTrySkill}
          previewWorkspaceFile={props.previewWorkspaceFile}
          onAddFromMarketplace={
            props.onAddFromMarketplace
              ? (agentId) => {
                  setDraft((state) => {
                    state.skills.reopenAfterMarketplace = true;
                    state.skills.open = false;
                  });
                  props.onAddFromMarketplace?.(agentId);
                }
              : undefined
          }
          onOpenChange={(open) =>
            setDraft((state) => {
              state.skills.open = open;
            })
          }
          onCountChange={(count) =>
            setDraft((state) => {
              state.skills.count = count;
            })
          }
        />
      </Show>
    </SharedAgentSettingsPanel>
  );
}
