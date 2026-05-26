import type { ProjectConfig, PuterIssue } from "@lucky9/puter-core";
import { PuterError } from "@lucky9/puter-core";

export interface LinearClientOptions {
  apiKey?: string;
  endpoint?: string;
}

export interface LinearWorkflowState {
  id: string;
  name: string;
  type?: string;
}

export interface LinearTeam {
  id: string;
  key: string;
  name: string;
  states?: { nodes: LinearWorkflowState[] };
}

export interface LinearProject {
  id: string;
  name: string;
  slugId?: string;
  teams?: { nodes: LinearTeam[] };
}

export interface LinearIssueNode extends PuterIssue {
  comments?: { nodes: LinearComment[] };
}

export interface LinearComment {
  id: string;
  body: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateIssueInput {
  teamId: string;
  title: string;
  description?: string;
  projectId?: string;
  stateId?: string;
  labelIds?: string[];
}

export interface UpdateIssueInput {
  id: string;
  stateId?: string;
  description?: string;
  labelIds?: string[];
}

export class LinearClient {
  private readonly apiKey: string;
  private readonly endpoint: string;

  constructor(options: LinearClientOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.LINEAR_API_KEY ?? "";
    this.endpoint = options.endpoint ?? "https://api.linear.app/graphql";
    if (!this.apiKey) {
      throw new PuterError(500, "missing_linear_api_key", "Set LINEAR_API_KEY.");
    }
  }

  async request<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        authorization: this.apiKey,
        "content-type": "application/json"
      },
      body: JSON.stringify({ query, variables })
    });

    if (!response.ok) {
      throw new PuterError(response.status, "linear_http_error", `Linear returned ${response.status}.`);
    }

    const body = (await response.json()) as { data?: T; errors?: unknown };
    if (body.errors) {
      throw new PuterError(502, "linear_graphql_error", "Linear GraphQL returned errors.", body.errors);
    }
    if (!body.data) {
      throw new PuterError(502, "linear_empty_response", "Linear response did not include data.");
    }
    return body.data;
  }

  async resolveTeam(teamKeyOrName: string): Promise<LinearTeam> {
    const data = await this.request<{ teams: { nodes: LinearTeam[] } }>(`
      query PuterTeams {
        teams(first: 100) {
          nodes {
            id
            key
            name
            states {
              nodes { id name type }
            }
          }
        }
      }
    `);
    const wanted = teamKeyOrName.toLowerCase();
    const team = data.teams.nodes.find(
      (node) => node.key.toLowerCase() === wanted || node.name.toLowerCase() === wanted
    );
    if (!team) {
      throw new PuterError(404, "linear_team_not_found", `Linear team not found: ${teamKeyOrName}`);
    }
    return team;
  }

  async resolveProject(project: ProjectConfig): Promise<LinearProject | undefined> {
    if (!project.linearProject && !project.linearProjectSlug) {
      return undefined;
    }

    const data = await this.request<{ projects: { nodes: LinearProject[] } }>(`
      query PuterProjects {
        projects(first: 250, includeArchived: false) {
          nodes {
            id
            name
            slugId
            teams { nodes { id key name } }
          }
        }
      }
    `);

    const wantedName = project.linearProject?.toLowerCase();
    const wantedSlug = project.linearProjectSlug?.toLowerCase();
    const match = data.projects.nodes.find((node) => {
      return (
        (wantedSlug && node.slugId?.toLowerCase() === wantedSlug) ||
        (wantedName && node.name.toLowerCase() === wantedName)
      );
    });

    if (!match) {
      throw new PuterError(404, "linear_project_not_found", "Configured Linear project was not found.");
    }
    return match;
  }

  async resolveState(team: LinearTeam, stateName: string): Promise<LinearWorkflowState> {
    const state = team.states?.nodes.find((node) => node.name.toLowerCase() === stateName.toLowerCase());
    if (!state) {
      throw new PuterError(404, "linear_state_not_found", `Workflow state not found: ${stateName}`);
    }
    return state;
  }

  async getIssue(identifierOrId: string): Promise<LinearIssueNode> {
    const data = await this.request<{ issue: LinearIssueNode }>(
      `
      query PuterIssue($id: String!) {
        issue(id: $id) {
          id
          identifier
          title
          url
          state { name }
          labels { nodes { name } }
          comments(first: 100) {
            nodes { id body createdAt updatedAt }
          }
        }
      }
    `,
      { id: identifierOrId }
    );

    return normalizeIssue(data.issue);
  }

  async listProjectIssues(project: ProjectConfig, states: string[]): Promise<LinearIssueNode[]> {
    const resolvedProject = await this.resolveProject(project);
    const filter: Record<string, unknown> = {};
    if (resolvedProject) {
      filter.project = { id: { eq: resolvedProject.id } };
    }
    if (states.length > 0) {
      filter.state = { name: { in: states } };
    }

    const data = await this.request<{ issues: { nodes: LinearIssueNode[] } }>(
      `
      query PuterIssues($filter: IssueFilter) {
        issues(first: 100, filter: $filter) {
          nodes {
            id
            identifier
            title
            url
            state { name }
            labels { nodes { name } }
            comments(first: 50) {
              nodes { id body createdAt updatedAt }
            }
          }
        }
      }
    `,
      { filter }
    );

    return data.issues.nodes.map(normalizeIssue);
  }

  async createIssue(input: CreateIssueInput): Promise<LinearIssueNode> {
    const data = await this.request<{ issueCreate: { success: boolean; issue: LinearIssueNode } }>(
      `
      mutation PuterCreateIssue($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue {
            id
            identifier
            title
            url
            state { name }
            labels { nodes { name } }
          }
        }
      }
    `,
      { input }
    );

    if (!data.issueCreate.success) {
      throw new PuterError(502, "linear_issue_create_failed", "Linear issueCreate returned success=false.");
    }
    return normalizeIssue(data.issueCreate.issue);
  }

  async updateIssue(input: UpdateIssueInput): Promise<LinearIssueNode> {
    const { id, ...rest } = input;
    const data = await this.request<{ issueUpdate: { success: boolean; issue: LinearIssueNode } }>(
      `
      mutation PuterUpdateIssue($id: String!, $input: IssueUpdateInput!) {
        issueUpdate(id: $id, input: $input) {
          success
          issue {
            id
            identifier
            title
            url
            state { name }
            labels { nodes { name } }
          }
        }
      }
    `,
      { id, input: rest }
    );

    if (!data.issueUpdate.success) {
      throw new PuterError(502, "linear_issue_update_failed", "Linear issueUpdate returned success=false.");
    }
    return normalizeIssue(data.issueUpdate.issue);
  }

  async createComment(issueId: string, body: string): Promise<LinearComment> {
    const data = await this.request<{ commentCreate: { success: boolean; comment: LinearComment } }>(
      `
      mutation PuterCreateComment($input: CommentCreateInput!) {
        commentCreate(input: $input) {
          success
          comment { id body createdAt updatedAt }
        }
      }
    `,
      { input: { issueId, body } }
    );

    if (!data.commentCreate.success) {
      throw new PuterError(502, "linear_comment_create_failed", "Linear commentCreate returned success=false.");
    }
    return data.commentCreate.comment;
  }

  async updateComment(commentId: string, body: string): Promise<LinearComment> {
    const data = await this.request<{ commentUpdate: { success: boolean; comment: LinearComment } }>(
      `
      mutation PuterUpdateComment($id: String!, $input: CommentUpdateInput!) {
        commentUpdate(id: $id, input: $input) {
          success
          comment { id body createdAt updatedAt }
        }
      }
    `,
      { id: commentId, input: { body } }
    );

    if (!data.commentUpdate.success) {
      throw new PuterError(502, "linear_comment_update_failed", "Linear commentUpdate returned success=false.");
    }
    return data.commentUpdate.comment;
  }
}

type RawLinearIssue = Omit<LinearIssueNode, "state" | "labels"> & {
  state?: { name?: string } | string;
  labels?: { nodes?: { name: string }[] } | string[];
};

function normalizeIssue(issue: unknown): LinearIssueNode {
  const raw = issue as RawLinearIssue;

  return {
    ...raw,
    state: typeof raw.state === "string" ? raw.state : raw.state?.name,
    labels: Array.isArray(raw.labels)
      ? raw.labels
      : raw.labels?.nodes?.map((label: { name: string }) => label.name) ?? []
  };
}
