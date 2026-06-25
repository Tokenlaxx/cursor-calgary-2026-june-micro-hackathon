# OffDash

Cursor/VS Code extension: paste-ready work briefs from **git evidence** — primary interface is the **editor tab** and **clipboard**, not a dashboard.

## Layout

| Path | Role |
|------|------|
| `src/extension.ts` | Commands, progress UI, streaming into markdown editor |
| `src/gitEvidence.ts` | `git log` / `git diff` harvest + formatting |
| `src/briefGenerator.ts` | OpenAI-compatible streaming chat API |
| `src/prompts.ts` | Standup vs stakeholder system prompts |
| `src/test/` | Node test runner unit tests |

## Commands

- `offdash.standup` — standup bullets for Slack
- `offdash.stakeholder` — email-ready stakeholder update
- `offdash.copyLastBrief` — clipboard copy after edit

## Settings (`offdash.*`)

- `apiKey` — or env `OPENROUTER_API_KEY` / `OFFDASH_API_KEY` / `OPENAI_API_KEY`
- `apiBaseUrl` — default OpenRouter; any compatible endpoint
- `model` — default `openrouter/free` (free-model routing)
- `lookbackHours` — default 24

## Dev

```bash
npm install
npm test
npm run build
npm run package   # produces offdash-0.1.0.vsix
```

Install `.vsix` in Cursor: Extensions → … → Install from VSIX.

## Conventions

- Evidence-grounded prompts: never invent changes not in git output
- Canadian English in generated prose
- No secrets in repo
