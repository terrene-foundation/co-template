#!/usr/bin/env node
/**
 * Hook: session-start
 * Event: SessionStart
 * Purpose: Initialize session, detect workspace state, inject session notes
 *          into Claude context, output configuration.
 *
 * Exit Codes:
 *   0 = success (continue)
 *   2 = blocking error (stop tool execution)
 *   other = non-blocking error (warn and continue)
 */

const fs = require("fs");
const path = require("path");
const {
  parseEnvFile,
  discoverModelsAndKeys,
  ensureEnvFile,
  buildCompactSummary,
} = require("./lib/env-utils");
const {
  resolveLearningDir,
  ensureLearningDir,
  logObservation: logLearningObservation,
} = require("./lib/learning-utils");
const {
  detectActiveWorkspace,
  derivePhase,
  getTodoProgress,
  findAllSessionNotes,
} = require("./lib/workspace-utils");
const { checkVersion } = require("./lib/version-utils");

// Timeout fallback — prevents hanging the Claude Code session
const TIMEOUT_MS = 10000;
const _timeout = setTimeout(() => {
  console.log(JSON.stringify({ continue: true }));
  process.exit(1);
}, TIMEOUT_MS);

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  try {
    const data = JSON.parse(input);
    const result = initializeSession(data);
    const output = { continue: true };
    if (result.sessionNotesContext) {
      output.hookSpecificOutput = {
        hookEventName: "SessionStart",
        additionalContext: result.sessionNotesContext,
      };
    }
    console.log(JSON.stringify(output));
    process.exit(0);
  } catch (error) {
    console.error(`[HOOK ERROR] ${error.message}`);
    console.log(JSON.stringify({ continue: true }));
    process.exit(1);
  }
});

function initializeSession(data) {
  const session_id = (data.session_id || "unknown").replace(
    /[^a-zA-Z0-9_-]/g,
    "_",
  );
  const cwd = data.cwd || process.cwd();
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  const sessionDir = path.join(homeDir, ".claude", "sessions");
  const learningDir = resolveLearningDir(cwd);
  const result = { sessionNotesContext: null };

  // Ensure directories exist
  [sessionDir].forEach((dir) => {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {}
  });
  ensureLearningDir(cwd);

  // ── .env provision ────────────────────────────────────────────────────
  const envResult = ensureEnvFile(cwd);
  if (envResult.created) {
    console.error(
      `[ENV] Created .env from ${envResult.source}. Please fill in your API keys.`,
    );
  }

  // ── Parse .env ────────────────────────────────────────────────────────
  const envPath = path.join(cwd, ".env");
  const envExists = fs.existsSync(envPath);
  let env = {};
  let discovery = { models: {}, keys: {}, validations: [] };

  if (envExists) {
    env = parseEnvFile(envPath);
    discovery = discoverModelsAndKeys(env);
  }

  // ── Detect project type ─────────────────────────────────────────────
  const projectType = detectProjectType(cwd);

  // ── Log observation ───────────────────────────────────────────────────
  try {
    const observationsFile = path.join(learningDir, "observations.jsonl");
    fs.appendFileSync(
      observationsFile,
      JSON.stringify({
        type: "session_start",
        session_id,
        cwd,
        timestamp: new Date().toISOString(),
        envExists,
        projectType,
        models: discovery.models,
        keyCount: Object.keys(discovery.keys).length,
        validationFailures: discovery.validations
          .filter((v) => v.status === "MISSING_KEY")
          .map((v) => v.message),
      }) + "\n",
    );
  } catch {}

  // ── Version check (human-facing, stderr only) ─────────────────────────
  try {
    const versionResult = checkVersion(cwd);
    for (const msg of versionResult.messages) {
      console.error(msg);
    }
  } catch {}

  // ── Output workspace status (human-facing, stderr only) ──────────────
  try {
    const ws = detectActiveWorkspace(cwd);
    if (ws) {
      const phase = derivePhase(ws.path, cwd);
      const todos = getTodoProgress(ws.path);
      console.error(
        `[WORKSPACE] ${ws.name} | Phase: ${phase} | Todos: ${todos.active} active / ${todos.completed} done`,
      );
    }
  } catch {}

  // ── Session notes (inject into Claude context + human-facing stderr) ─
  try {
    const allNotes = findAllSessionNotes(cwd);
    if (allNotes.length > 0) {
      for (const note of allNotes) {
        const staleTag = note.stale ? " (STALE)" : "";
        const label = note.workspace ? ` [${note.workspace}]` : " [root]";
        console.error(
          `[SESSION-NOTES]${label} ${note.relativePath}${staleTag} — updated ${note.age}`,
        );
      }

      // Build context for Claude — include all notes
      const contextParts = [];
      for (const note of allNotes) {
        const label = note.workspace ? `[${note.workspace}]` : "[root]";
        const staleMark = note.stale ? " (STALE — may be outdated)" : "";
        contextParts.push(
          `## Session Notes ${label}${staleMark} — updated ${note.age}\n\n${note.content}`,
        );
      }
      if (contextParts.length > 0) {
        result.sessionNotesContext =
          "# Previous Session Notes\n\nRead these to understand where the last session left off.\n\n" +
          contextParts.join("\n\n---\n\n");
      }
    }
  } catch {}

  // ── Output model/key summary ──────────────────────────────────────────
  if (envExists) {
    const summary = buildCompactSummary(env, discovery);
    console.error(`[ENV] ${summary}`);

    // Detail each model-key validation
    for (const v of discovery.validations) {
      const icon = v.status === "ok" ? "✓" : "✗";
      console.error(`[ENV]   ${icon} ${v.message}`);
    }

    // Prominent warnings for missing keys
    const failures = discovery.validations.filter(
      (v) => v.status === "MISSING_KEY",
    );
    if (failures.length > 0) {
      console.error(
        `[ENV] WARNING: ${failures.length} model(s) configured without API keys!`,
      );
      console.error(
        "[ENV] LLM operations WILL FAIL. Add missing keys to .env.",
      );
    }
  } else {
    console.error(
      "[ENV] No .env file found. API keys and models not configured.",
    );
  }

  return result;
}

/**
 * Detect the project type based on filesystem contents.
 * Domain-agnostic — works for any CO workspace.
 */
function detectProjectType(cwd) {
  try {
    const hasWorkspaces = fs.existsSync(path.join(cwd, "workspaces"));
    const hasJournal = hasWorkspaces &&
      fs.readdirSync(path.join(cwd, "workspaces")).some((d) => {
        try {
          return fs.existsSync(path.join(cwd, "workspaces", d, "journal"));
        } catch { return false; }
      });

    if (hasWorkspaces && hasJournal) return "co-workspace";
    if (hasWorkspaces) return "co-workspace";
    return "co-project";
  } catch {
    return "unknown";
  }
}
