import assert from "node:assert/strict";
import test from "node:test";
import { appendReportToWorkpad, overlappingAreas, parseWorkpad, renderClaimWorkpad } from "../packages/core/dist/index.js";
import { parseGitHubPullRequestUrl } from "../packages/github/dist/index.js";

test("area overlap treats parent paths as conflicts", () => {
  assert.deepEqual(overlappingAreas(["apps/api"], ["apps/api/src/routes"]), ["apps/api"]);
  assert.deepEqual(overlappingAreas(["docs"], ["apps/api"]), []);
});

test("workpad renders and parses durable claim metadata", () => {
  const body = renderClaimWorkpad({
    issueId: "PUT-1",
    surface: "codex",
    owner: "agent",
    branch: "agent/PUT-1-test",
    areas: ["apps/api"]
  });
  const parsed = parseWorkpad(body);
  assert.equal(parsed?.issueId, "PUT-1");
  assert.equal(parsed?.surface, "codex");
  assert.deepEqual(parsed?.areas, ["apps/api"]);
});

test("workpad report appends failure context without changing parsed claim", () => {
  const body = renderClaimWorkpad({
    issueId: "PUT-2",
    surface: "github",
    owner: "actions",
    areas: ["ci"]
  });
  const updated = appendReportToWorkpad(body, {
    issueId: "PUT-2",
    status: "failed",
    exitCode: 1,
    command: "pnpm test",
    validation: "Command exited 1: pnpm test"
  });

  assert.match(updated, /### Report/);
  assert.match(updated, /- Status: failed/);
  assert.match(updated, /- Exit Code: 1/);
  assert.equal(parseWorkpad(updated)?.surface, "github");
});

test("GitHub PR URLs are parsed for handoff validation", () => {
  assert.deepEqual(parseGitHubPullRequestUrl("https://github.com/luckybucky9/puter/pull/12"), {
    owner: "luckybucky9",
    repo: "puter",
    number: 12
  });
  assert.equal(parseGitHubPullRequestUrl("https://example.com/nope"), null);
});
