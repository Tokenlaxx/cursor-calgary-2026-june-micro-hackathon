import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatEvidenceBlock, type GitEvidence } from "../gitEvidence.js";
import { buildSystemPrompt, buildUserPrompt } from "../prompts.js";

const sample: GitEvidence = {
  repoRoot: "/tmp/repo",
  branch: "feature/demo",
  lookbackHours: 24,
  commits: ["abc123 Fix auth (jj, 2 hours ago)"],
  diffStat: " src/auth.ts | 4 +-\n 1 file changed, 2 insertions(+), 2 deletions(-)",
  diffPatch: "diff --git a/src/auth.ts\n+export const ok = true;",
  statusShort: " M README.md",
  filesChanged: ["src/auth.ts"],
};

describe("formatEvidenceBlock", () => {
  it("includes branch and commits", () => {
    const block = formatEvidenceBlock(sample);
    assert.match(block, /feature\/demo/);
    assert.match(block, /Fix auth/);
    assert.match(block, /src\/auth\.ts/);
  });
});

describe("prompts", () => {
  it("standup prompt asks for standup sections", () => {
    const sys = buildSystemPrompt("standup");
    assert.match(sys, /Standup/);
    assert.match(sys, /Never invent/);
  });

  it("user prompt embeds evidence", () => {
    const user = buildUserPrompt("stakeholder", "Branch: main");
    assert.match(user, /GIT EVIDENCE/);
    assert.match(user, /stakeholder/);
  });
});
