export type BriefKind = "standup" | "stakeholder";

export function buildSystemPrompt(kind: BriefKind): string {
  const shared = [
    "You write paste-ready work updates grounded ONLY in supplied git evidence.",
    "Never invent tickets, features, or file changes not shown in the evidence.",
    "If evidence is thin, say what is unknown instead of guessing.",
    "Use Canadian English spelling in prose (colour, behaviour).",
    "Output markdown only — no preamble about being an AI.",
  ];

  if (kind === "standup") {
    return [
      ...shared,
      "Format:",
      "# Standup",
      "## Yesterday / since last sync",
      "- 3–6 bullets, each tied to a commit or file change",
      "## Today",
      "- 1–3 bullets inferred only from in-progress files in status",
      "## Blockers",
      "- bullets or 'None'",
    ].join("\n");
  }

  return [
    ...shared,
    "Audience: non-technical stakeholder who will paste this into email or Slack.",
    "Format:",
    "# Shipped update",
    "## Summary",
    "- 2–3 sentences, outcome-focused, no jargon",
    "## What changed",
    "- bullets mapped to real files/commits",
    "## Risk / follow-up",
    "- only if evidence supports it, else 'None noted'",
  ].join("\n");
}

export function buildUserPrompt(kind: BriefKind, evidenceBlock: string): string {
  const intent =
    kind === "standup"
      ? "Write a standup brief a developer can paste into Slack."
      : "Write a stakeholder update a developer can paste into email.";

  return `${intent}\n\n--- GIT EVIDENCE ---\n${evidenceBlock}\n--- END EVIDENCE ---`;
}
