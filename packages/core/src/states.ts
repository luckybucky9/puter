import type { ProjectConfig, ProjectStates } from "./types.js";

export const DEFAULT_STATES: ProjectStates = {
  backlog: "Backlog",
  ready: "Todo",
  claimed: "In Progress",
  review: "In Review",
  blocked: "Blocked",
  terminal: ["Done", "Canceled", "Duplicate"]
};

export function projectStates(project: ProjectConfig): ProjectStates {
  return {
    ...DEFAULT_STATES,
    ...project.states,
    terminal: project.states?.terminal ?? DEFAULT_STATES.terminal
  };
}

export function activeStateNames(project: ProjectConfig): string[] {
  const states = projectStates(project);
  return [states.ready, states.claimed, states.review, states.blocked];
}
