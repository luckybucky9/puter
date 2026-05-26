export interface PullRequestRef {
  owner: string;
  repo: string;
  number: number;
}

export function parseGitHubPullRequestUrl(url: string): PullRequestRef | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "github.com") {
      return null;
    }
    const [owner, repo, pull, number] = parsed.pathname.split("/").filter(Boolean);
    if (!owner || !repo || pull !== "pull" || !number) {
      return null;
    }
    const parsedNumber = Number(number);
    if (!Number.isInteger(parsedNumber) || parsedNumber <= 0) {
      return null;
    }
    return { owner, repo, number: parsedNumber };
  } catch {
    return null;
  }
}

export class GitHubClient {
  private readonly token: string | undefined;

  constructor(token = process.env.GITHUB_TOKEN) {
    this.token = token;
  }

  async getPullRequest(url: string): Promise<Record<string, unknown> | null> {
    const ref = parseGitHubPullRequestUrl(url);
    if (!ref || !this.token) {
      return null;
    }

    const response = await fetch(`https://api.github.com/repos/${ref.owner}/${ref.repo}/pulls/${ref.number}`, {
      headers: {
        authorization: `Bearer ${this.token}`,
        accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28"
      }
    });

    if (!response.ok) {
      return null;
    }
    return (await response.json()) as Record<string, unknown>;
  }
}
