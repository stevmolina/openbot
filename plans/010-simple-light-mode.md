# Plan 010: Simple light mode for the desktop app

> **Executor instructions**: Read this whole plan and open
> `plans/010-simple-light-mode/mockups/screens.html` in a browser before you
> change anything. The mockup is the approved target. Work stage by stage and
> take the screenshots each stage asks for. If a "STOP conditions" item occurs,
> stop and report. When done, set the state of this plan in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 9491b02ab..upstream/main -- packages/brand/src packages/ui/src/features/sidebar packages/ui/src/features/conversation src/renderer/src/features/sidebar src/renderer/src/features/conversation src/renderer/src/styles`
> Large upstream changes in these paths mean the code map below is stale.
> Re-check it before you start.

## Status

- **Priority**: P1 for this fork (the owner's daily app)
- **Effort**: L
- **Risk**: LOW (visual and layout only, no data or auth changes)
- **Depends on**: none
- **Category**: design
- **Planned at**: commit `9491b02ab`, 2026-10-21
- **Branch**: `design/simple-light` on `stevmolina/openbot`

## Why this matters

The owner uses OpenBot every day but finds the dark UI busy: an icon rail,
a host switcher, provider rings, model pickers and message buttons all compete
with the chat. Grok Bot shows the same kind of product can look calm. This plan
gives OpenBot a light theme and Grok Bot's simple layout while keeping every
feature reachable.

This fork is for personal, non-commercial use. The license is PolyForm
Noncommercial 1.0.0.

## Decisions (approved by the owner on 2026-10-21)

1. **Light mode**, with warm off-white surfaces like Grok Bot.
2. **Nothing is removed.** Every feature moves to a place that matches how often
   it is used.
3. **The left icon rail goes away.** In its place, a bottom bar sits under the
   sidebar: your photo, then three buttons.
4. **Tables are clean cards**, outside the message bubble, with no avatars in
   the cells. Copy as Markdown and Copy as CSV show only on hover.
5. **No "bot inside a bot".** An agent mention in text is the agent's name in
   bold and in its color. No small avatar chip.
6. **The agent side panel looks like Grok Bot's**: a big avatar, the name, the
   title, then tabs.
7. **The mockup's dashed blue outline around the table was only a highlight.**
   Do not build it.

## Where every feature lives

| Today in OpenBot | In simple light mode |
|---|---|
| Rail: Agents | Bottom bar, chat button (the default view) |
| Rail: Routines, Tasks, Schedule | Bottom bar, clock button. The sidebar list becomes Tasks, Schedule, then the routines |
| Rail: Marketplace | Bottom bar, plug button. The sidebar becomes Marketplace, Connectors, then AI providers |
| Rail: provider rings (Claude, Codex, Grok) | Plug button, "AI providers" group, one status dot each (green on, orange needs attention) |
| Rail: Usage, Help, Settings | Click your photo: a menu with Settings, Usage, Help |
| Top bar: host switcher ("Local") | Photo menu, "Switch host" |
| Top bar: model picker (GPT-6-Luna, Low) | Agent side panel, Details tab, "Runs on" |
| Top bar: right panel toggle | Click the agent's name pill at the top of the chat |
| Agent settings: name, title | Panel header (big avatar, name, title under it) |
| Agent settings: model, reasoning | Details tab, "Runs on" card |
| Agent settings: routines | Details tab, "Routines" card |
| Agent settings: memories, skills, files, tables | Library tab |
| Browser, computer use | Computer tab |
| Agent settings: instructions, backup models, permissions, publish, usage | "More settings" link at the bottom of Details |
| Message actions: copy, react, reply | Show only on hover |
| Routine details column | Hidden; opens from a "Details" button next to "Run now" |

## Screen by screen

The mockup has all five screens. Short notes on each:

1. **Chat.** One centered column. Agent messages sit in soft gray bubbles. Your
   messages are dark bubbles on the right. The agent's name is a small pill at
   the top center. The message box is a white rounded bar with a red send
   button.
2. **Agent side panel.** A share button and a close button sit top right, with
   a 72px avatar, the name and the title below them. Tabs: Details, Library,
   Computer. Details holds Suggestions (can be hidden), Runs on, Routines, and
   "More settings".
3. **Routines.** The canvas has a light dotted background. Nodes are white cards
   with an 18px radius. A missing trigger shows as an orange line with a
   "Connect" link. "Ask an agent to edit this diagram" sits bottom left and the
   zoom buttons bottom right. The top right has a "Details" button and a dark
   "Run now" button.
4. **Schedule.** Big title, Today arrows, the date range, and a Day/Week/Month
   switch. Each day is a white card. Today's date is a blue circle. Runs are
   pink chips. "Upcoming runs" is a list card under the week.
5. **Usage.** Big title, plus "All agents" and "Last 30 days" filters. Four
   number cards: Tokens, Sessions, Messages, Cost. When cost is missing, one
   gray line ("Not reported by Codex") replaces the "Unavailable" labels.
   Below come a tokens-per-day line chart and a "By agent" table card.
6. **Marketplace.** Grok Bot style: a big title, filter buttons (Agents, Apps,
   Skills, then categories), a wide search bar, four "Most installed" cards,
   and a two-column list with gray "Add" buttons.
7. **Settings.** Keep the current tabs. Apply the light colors only.

Design values are in `plans/010-simple-light-mode/tokens-light.css`.

## Approach

Keep the changes a thin layer so upstream merges stay cheap. Upstream lands
about 100 commits a month.

- **Theme**: add the light values as a token layer
  (`:root[data-openbot-theme="simple-light"]`) that overrides
  `packages/brand/src/tokens.css`. Do not edit the dark values.
- **Layout**: put the new sidebar bottom bar and the panel changes behind one
  setting, "Simple layout", that is on by default in this fork. When it is off,
  the upstream layout shows. This also gives a quick before and after.
- Reuse the existing components (the agent settings panel, schedule and usage
  views). Restyle and regroup them. Do not rewrite them.

## Code map (at 9491b02ab)

- Tokens: `packages/brand/src/tokens.css` (always dark, 422 lines).
  `tokens-native.css` is the mobile light layer, so use it as a reference.
  CSS entry: `src/renderer/src/styles.css`. Shell: `src/renderer/src/styles/app-shell.css`, `base.css`.
- Sidebar: `src/renderer/src/features/sidebar/WorkspaceSidebar.tsx`. UI in
  `packages/ui/src/features/sidebar/` (`Sidebar.tsx`, `SidebarFrame.tsx`,
  `SidebarNav.tsx` is the icon rail, `SidebarAgentRow.tsx`, `SidebarTopbar.tsx`,
  `sidebar-views.css`). Frame: `src/renderer/src/WorkspaceShell.tsx`, `WorkspaceFrame.tsx`.
- Conversation: `src/renderer/src/features/conversation/` (`Conversation.tsx`,
  `ConversationView.tsx`, `ConversationTimeline.tsx`, `ConversationComposer.tsx`).
  UI in `packages/ui/src/features/conversation/` (`ConversationHeader.tsx`,
  `ChatMessageRow.tsx`, `MessageRendering.tsx`, `MarkdownMessageText.tsx`,
  `RichMessageText.tsx`, `ComposerEditor.tsx`) and its `styles/` folder
  (`messages.css`, `message-content.css`, `timeline.css`, `layout.css`,
  `header-layout.css`, `side-panel.css`, `composer.css`, `agent-settings.css`).
- Agent panel: `packages/ui/src/features/conversation/AgentSettingsPanel.tsx`
  (1565 lines), wired in `src/renderer/src/features/conversation/AgentSettingsPanel.tsx`.
- Other screens: `src/renderer/src/features/routine-flows/RoutineFlowsCanvas.tsx`,
  `features/schedule/SchedulePanel.tsx` and `schedule.css`, `features/tasks/TasksView.tsx`,
  `features/settings/SettingsModal.tsx` and `settings-modal.css`.
- Shared parts: `packages/ui/src/` (`button.tsx`, `select.tsx`, `badge.tsx`, `bubble.tsx`).

## Stages

Each stage ends with `bun run check` passing and screenshots of the changed
screens.

1. **Light tokens.** Add the token layer and turn it on. Fix every place that
   hardcodes a dark color. Screenshot all five screens.
2. **Sidebar bottom bar.** Hide the icon rail. Add the photo plus chat, clock
   and plug buttons. Each button swaps the sidebar list. Move the provider
   status, the host switcher, Usage, Help and Settings as the table above says.
3. **Chat.** Mentions as colored names. Tables as cards outside the bubble.
   Message actions on hover. Model picker out of the top bar.
4. **Agent side panel.** Header, tabs (Details, Library, Computer), "More
   settings".
5. **Routines, Schedule, Usage, Marketplace.** Match the mockup.
6. **Settings.** Light colors only.

## Run and screenshot

```sh
cd <worktree>
export PATH=$HOME/.bun-1.4.2/bin:$PATH   # dev needs Bun 1.4.2 exactly
bun install --frozen-lockfile
bun run dev                               # seeds fake agents, no login needed
bun run dev:automation screenshot --out=<name>.png
bun run dev:stop
```

Screenshots land in `.openbot-build/` (gitignored). The repo forbids tracked
images outside asset folders, so never commit them.

On the owner's MacBook, local only and not in git:
- Before screenshots: `~/dev/projects/openbot-desktop-shots/before/` (17 screens)
- Grok Bot references: `~/dev/projects/openbot-desktop-shots/references/`

## Done when

- All five mockup screens match in the running app, light mode, with nothing
  removed.
- Proof for the owner: before and after screenshots side by side for each
  screen, plus a short screen recording (10 to 30 seconds) clicking through
  chat, the agent panel, clock, plug and the photo menu.
- `bun run check` passes.

## STOP conditions

- A change would delete a feature rather than move it.
- A screen needs a login or a real account to show.
- Upstream changed a file in the code map so much that this plan no longer fits.
