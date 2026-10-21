import { defineMessages } from "../../message";

/** The simple layout of this fork: the light theme, the sidebar bottom bar and the agent panel tabs. */
export const messages = defineMessages("simple", {
  "simple.setting.title": "Simple layout",
  "simple.setting.description": "A light theme with a calm layout. Turn it off to see the standard layout.",
  // The agent side panel: the header, the Details, Library and Computer tabs, and its two pages.
  "simple.agentPanel.tabs": "Agent sections",
  "simple.agentPanel.tab.details": "Details",
  "simple.agentPanel.tab.library": "Library",
  "simple.agentPanel.tab.computer": "Computer",
  "simple.agentPanel.runsOn": "Runs on",
  "simple.agentPanel.runsOnLabel": "Runs on {model}, {effort}. Change the model and reasoning",
  "simple.agentPanel.effort": "{effort} effort",
  "simple.agentPanel.routines.manage": "Manage",
  "simple.agentPanel.routines.empty":
    "Routines are recurring tasks this agent runs on a schedule. Ask it in chat to set one up.",
  "simple.agentPanel.more": "More settings",
});
