import type { RoutineCalendar } from "@openbot/contracts/ipc";
import { AGENT_TASKS_CAPABILITY } from "@openbot/contracts/team-protocol/agent-tasks-v1";
import { CalendarClock, ListChecks } from "@openbot/ui";
import { useText } from "@openbot/ui/text";
import { createEffect, createSignal, Show } from "solid-js";
import { desktopScheduleSource } from "../schedule/schedule-port";
import { serverSupportsCapability } from "../servers/server-capabilities";
import { useServers } from "../servers/servers-context";
import { useWindowPage } from "../window/window-page-context";
import { SimpleSidebarLink } from "./SimpleSidebarLink";

/** How far ahead the Schedule row counts runs: the week that the schedule page opens on. */
const UPCOMING_WINDOW_MS = 7 * 86_400_000;

/** The runs still to come in the calendar, as the schedule page lists them under "Upcoming runs". */
function upcomingRuns(calendar: RoutineCalendar, now: number): number {
  const active = new Set(calendar.routines.filter((routine) => routine.active).map((routine) => routine.id));
  return calendar.runs.filter((run) => {
    if (Date.parse(run.at) < now) return false;
    if (run.status === "scheduled") return active.has(run.routineId);
    return run.status === "queued" || run.status === "running";
  }).length;
}

/**
 * The top of the clock list: Tasks and Schedule, then the heading of the routines. The routines under
 * it are the sidebar list in its Routines view, so selecting one shows its canvas, as before.
 */
export function SimpleClockList() {
  const { t } = useText();
  const windowPage = useWindowPage();
  const { activeServer, activeServerId } = useServers();
  const [upcoming, setUpcoming] = createSignal<number | null>(null);

  // An older joined server has no task routes.
  const tasksAvailable = () => {
    const server = activeServer();
    return !server || server.kind === "local" || serverSupportsCapability(server, AGENT_TASKS_CAPABILITY);
  };

  // The count is known once the calendar of the server answers. It reads again after a change on the server.
  createEffect(activeServerId, (serverId) => {
    setUpcoming(null);
    if (!serverId) return;
    const source = desktopScheduleSource();
    let current = true;
    const read = () => {
      const now = Date.now();
      source
        .calendar({ from: new Date(now).toISOString(), to: new Date(now + UPCOMING_WINDOW_MS).toISOString() }, serverId)
        .then((calendar) => {
          if (current) setUpcoming(upcomingRuns(calendar, Date.now()));
        })
        .catch(() => {
          // The row shows no count while the calendar does not answer.
        });
    };
    read();
    const stop = source.onStale(serverId, read);
    return () => {
      current = false;
      stop();
    };
  });

  const upcomingLabel = () => {
    const count = upcoming();
    return count === null ? undefined : t("simple.clock.upcoming", { count });
  };

  return (
    <div class="simple-sidebar-links">
      <Show when={tasksAvailable()}>
        <SimpleSidebarLink
          label={t("app.rail.tasks")}
          icon={<ListChecks />}
          current={windowPage.page() === "tasks"}
          onClick={(button) => {
            windowPage.openTasks(button);
          }}
        />
      </Show>
      <SimpleSidebarLink
        label={t("app.rail.schedule")}
        icon={<CalendarClock />}
        meta={upcomingLabel()}
        metaLabel={upcomingLabel()}
        current={windowPage.page() === "schedule"}
        onClick={(button) => {
          windowPage.openSchedule(button);
        }}
      />
      <h2 class="simple-sidebar-group">{t("sidebar.view.routines")}</h2>
    </div>
  );
}
