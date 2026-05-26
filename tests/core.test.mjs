import assert from "node:assert/strict";
import test from "node:test";
import { overlappingAreas, parseWorkpad, renderClaimWorkpad } from "../packages/core/dist/index.js";
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

test("GitHub PR URLs are parsed for handoff validation", () => {
  assert.deepEqual(parseGitHubPullRequestUrl("https://github.com/Lucky9-Labs/puter/pull/12"), {
    owner: "Lucky9-Labs",
    repo: "puter",
    number: 12
  });
  assert.equal(parseGitHubPullRequestUrl("https://example.com/nope"), null);
});
