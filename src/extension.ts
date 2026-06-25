import * as vscode from "vscode";
import { streamBrief } from "./briefGenerator";
import { collectGitEvidence, formatEvidenceBlock } from "./gitEvidence";
import type { BriefKind } from "./prompts";

let lastBriefText = "";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("offdash.standup", () => runBrief("standup")),
    vscode.commands.registerCommand("offdash.stakeholder", () => runBrief("stakeholder")),
    vscode.commands.registerCommand("offdash.copyLastBrief", async () => {
      if (!lastBriefText) {
        vscode.window.showWarningMessage("OffDash: generate a brief first.");
        return;
      }
      await vscode.env.clipboard.writeText(lastBriefText);
      vscode.window.showInformationMessage("OffDash: copied last brief to clipboard.");
    })
  );
}

export function deactivate() {}

async function replaceEntireDocument(
  editor: vscode.TextEditor,
  doc: vscode.TextDocument,
  text: string
): Promise<void> {
  const end = doc.getText().length;
  const range = new vscode.Range(doc.positionAt(0), doc.positionAt(end));
  await editor.edit((eb) => eb.replace(range, text));
}

async function runBrief(kind: BriefKind) {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) {
    vscode.window.showErrorMessage("OffDash: open a folder with a git repo first.");
    return;
  }

  const config = vscode.workspace.getConfiguration("offdash");
  const apiKey =
    config.get<string>("apiKey") ||
    process.env.OPENROUTER_API_KEY ||
    process.env.OFFDASH_API_KEY ||
    process.env.OPENAI_API_KEY ||
    "";

  if (!apiKey) {
    vscode.window.showErrorMessage(
      "OffDash: set offdash.apiKey or OPENROUTER_API_KEY / OFFDASH_API_KEY / OPENAI_API_KEY."
    );
    return;
  }

  const lookbackHours = config.get<number>("lookbackHours") ?? 24;
  const apiBaseUrl = config.get<string>("apiBaseUrl") ?? "https://openrouter.ai/api/v1";
  const model = config.get<string>("model") ?? "openrouter/free";

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `OffDash: collecting git evidence…`,
      cancellable: false,
    },
    async () => {
      try {
        const evidence = await collectGitEvidence(folder.uri.fsPath, lookbackHours);
        const evidenceBlock = formatEvidenceBlock(evidence);
        const title =
          kind === "standup"
            ? `OffDash Standup — ${evidence.branch}`
            : `OffDash Stakeholder — ${evidence.branch}`;

        const header = `# ${title}\n\n`;
        let streamed = `${header}_Generating from git evidence…_\n`;

        const doc = await vscode.workspace.openTextDocument({
          content: streamed,
          language: "markdown",
        });
        const editor = await vscode.window.showTextDocument(doc, { preview: false });

        lastBriefText = streamed;

        await streamBrief(
          kind,
          evidenceBlock,
          { apiKey, apiBaseUrl, model },
          async (chunk) => {
            if (streamed.endsWith("_Generating from git evidence…_\n")) {
              streamed = header;
            }
            streamed += chunk;
            lastBriefText = streamed;
            await replaceEntireDocument(editor, doc, streamed);
          }
        );

        streamed += `\n\n---\n_Evidence window: ${lookbackHours}h · branch ${evidence.branch}_`;
        lastBriefText = streamed;
        await replaceEntireDocument(editor, doc, streamed);

        vscode.window.showInformationMessage(
          "OffDash: brief ready — edit, then copy or run OffDash: Copy Last Brief."
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`OffDash failed: ${message}`);
      }
    }
  );
}
