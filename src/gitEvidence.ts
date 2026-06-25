import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface GitEvidence {
  repoRoot: string;
  branch: string;
  lookbackHours: number;
  commits: string[];
  diffStat: string;
  diffPatch: string;
  statusShort: string;
  filesChanged: string[];
}

const MAX_DIFF_CHARS = 12000;

export async function collectGitEvidence(
  workspaceRoot: string,
  lookbackHours: number
): Promise<GitEvidence> {
  const since = `${lookbackHours} hours ago`;
  const branch = (await git(workspaceRoot, ["rev-parse", "--abbrev-ref", "HEAD"])).stdout.trim();
  const commitsRaw = await git(workspaceRoot, [
    "log",
    `--since=${since}`,
    "--pretty=format:%h %s (%an, %ar)",
  ]);
  const commits = commitsRaw.stdout
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const diffStat = (
    await git(workspaceRoot, ["diff", "--stat", `HEAD@{${since}}`, "HEAD"])
  ).stdout.trim();

  let diffPatch = (
    await git(workspaceRoot, ["diff", `HEAD@{${since}}`, "HEAD", "--no-color"])
  ).stdout.trim();

  if (diffPatch.length > MAX_DIFF_CHARS) {
    diffPatch =
      diffPatch.slice(0, MAX_DIFF_CHARS) +
      "\n\n[diff truncated — evidence cap for token safety]";
  }

  const statusShort = (await git(workspaceRoot, ["status", "--short"])).stdout.trim();

  const filesChanged = diffStat
    .split("\n")
    .slice(0, -1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/\s+/).pop() ?? line);

  return {
    repoRoot: workspaceRoot,
    branch,
    lookbackHours,
    commits,
    diffStat,
    diffPatch,
    statusShort,
    filesChanged,
  };
}

export function formatEvidenceBlock(evidence: GitEvidence): string {
  const sections = [
    `Branch: ${evidence.branch}`,
    `Lookback: ${evidence.lookbackHours}h`,
    "",
    "Commits:",
    evidence.commits.length ? evidence.commits.map((c) => `- ${c}`).join("\n") : "- (none)",
    "",
    "Diff stat:",
    evidence.diffStat || "(no diff in window)",
    "",
    "Working tree:",
    evidence.statusShort || "(clean)",
  ];

  if (evidence.diffPatch) {
    sections.push("", "Patch excerpt:", evidence.diffPatch);
  }

  return sections.join("\n");
}

async function git(cwd: string, args: string[]) {
  return execFileAsync("git", args, {
    cwd,
    maxBuffer: 8 * 1024 * 1024,
    encoding: "utf8",
  });
}
