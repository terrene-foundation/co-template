/**
 * violation-patterns — agnostic structural detectors for atelier's hook substrate.
 *
 * Each detector returns {type, detail, severity} or null. Detectors check
 * STRUCTURAL/STATE facts (path prefixes, command verbs, porcelain ordering,
 * lexical advisory signals) — never semantic meaning. Lexical detectors are
 * ADVISORY (severity:'warn'); they record/WARN and MUST NOT hard-block.
 *
 * Confused-deputy hazard: a bash command string is the PRE-EXPANSION text, so
 * shell variables ($VAR / ${VAR} / $(...) / `...`) cannot be resolved at hook
 * time. Detectors MUST skip targets that contain unexpanded shell variables
 * rather than guess — guessing would emit false drift findings on the value the
 * shell would actually substitute.
 *
 * Atelier is CC+CO methodology authority, NOT codegen: no SDK/VCS/crypto/ledger
 * awareness here. Node built-ins only, CommonJS.
 */

const path = require("path");

/**
 * True if the string contains an unexpanded shell variable / substitution.
 * Such targets are unresolvable at hook time — skip them (confused-deputy).
 */
function hasShellVar(s) {
  if (!s || typeof s !== "string") return false;
  return (
    /\$\{?\w+\}?/.test(s) || // $VAR, ${VAR}
    /\$\(/.test(s) || // $(...)
    /`/.test(s) // backticks
  );
}

/**
 * Extract absolute-path-looking tokens from a command string.
 * Returns tokens that start with "/" or "~/" (after stripping surrounding
 * quotes). Tokens containing unexpanded shell variables are dropped.
 */
function absPathTokens(command) {
  if (!command || typeof command !== "string") return [];
  const out = [];
  // Split on whitespace; tolerate simple single/double quoting by stripping.
  for (let raw of command.split(/\s+/)) {
    // Strip surrounding quotes/parens AND trailing shell punctuation (; , ) & | "
    // ') so a path adjacent to a separator (e.g. `...atelier";`) is not mangled
    // into a token that evades the in-scope prefix check.
    const tok = raw.replace(/^["'(]+/, "").replace(/["');,&|]+$/, "");
    if (!tok) continue;
    if (hasShellVar(tok)) continue; // unresolvable — skip
    if (tok.startsWith("/") || tok.startsWith("~/")) out.push(tok);
  }
  return out;
}

/**
 * Normalize a token to an absolute path for prefix comparison.
 * Expands a leading "~" to the home dir; leaves other absolute paths as-is.
 */
function toAbsolute(tok) {
  if (tok.startsWith("~/")) {
    const home = process.env.HOME || "";
    return path.posix.normalize(path.posix.join(home, tok.slice(2)));
  }
  return path.posix.normalize(tok);
}

/**
 * File-output redirect TARGETS in a command. Matches any `>`/`>>` redirect —
 * bare (`> f`), fd-qualified (`1> f`, `2> f`, `2>> f`), or redirect-both
 * (`&> f`, `&>> f`) — and returns the target token. The fd number is
 * IRRELEVANT: a redirect to ANY fd that lands in a file writes that file's
 * repo, so `1>sibling`, `2>sibling`, and `&>sibling` are all sibling writes;
 * whether the target is a sibling is decided by the caller.
 *
 * fd-DUPLICATION (`2>&1`, `>&2`, `1>&2`) is NOT a file write — its target is a
 * descriptor (`&N`), not a path — and is excluded structurally: the target
 * char class forbids a leading `&`, so `2>&1` and `>&2` match no target. This
 * is exactly why a read command with a stderr/fd redirect (`ls sibling 2>&1`)
 * no longer false-flags (GH #45): `2>&1` yields no file target, and a redirect
 * to a non-sibling (`cat sibling 2>/dev/null`, `… > /tmp/out`) yields a target
 * the caller rejects. Tokens with unexpanded shell variables are dropped
 * (confused-deputy — unresolvable at hook time).
 */
function fileRedirectTargets(command) {
  if (!command || typeof command !== "string") return [];
  const out = [];
  const re = /\d*>>?\s*("?)([^\s"';|&>]+)\1/g;
  let m;
  while ((m = re.exec(command)) !== null) {
    const tok = m[2];
    if (!tok || hasShellVar(tok)) continue;
    out.push(tok);
  }
  return out;
}

/**
 * detectRepoScopeDrift — bash that MUTATES a sibling-repo path (a different
 * path under the repos-root, outside the cwd repo). Structural prefix check
 * only. Skips tokens with unexpanded shell variables. WARN, never block.
 *
 * A command drifts only through one of two MUTATE channels:
 *   (1) a write/mutate VERB (rm/mv/cp/touch/mkdir/tee/gh/git-write, incl.
 *       `git -C <path> <write>`) whose argument is a sibling path, or
 *   (2) a file-output REDIRECT (any fd) whose TARGET is a sibling path.
 * Read-only commands that merely NAME a sibling path are NOT drift — including
 * verification reads that append an fd-duplication (`ls sibling 2>&1`: the
 * target is a descriptor, not a file) or a redirect to a non-sibling target
 * (`cat sibling 2>/dev/null`, `cat sibling > /tmp/out`: the sibling is only
 * read, the write lands locally). Only a redirect whose TARGET is the sibling
 * (`… 1>sibling`, `… 2>>sibling`, `… &>sibling`, `echo x > sibling`) or a
 * mutate verb with a sibling argument drifts (GH #45).
 *
 * NOTE (verb-channel breadth): a mutate verb puts EVERY sibling-path argument
 * at risk, so `cat sibling | tee /tmp/x` flags on the sibling READ token — the
 * detector cannot tell which argument the verb writes. This is advisory and
 * pre-dates GH #45; the gate probe is the authoritative verdict.
 */
function detectRepoScopeDrift(bashCommand, projectDir) {
  if (!bashCommand || typeof bashCommand !== "string") return null;

  // `git -C <path> <write>` interposes the `-C <path>` flag before the write
  // subcommand, so the git arm tolerates any number of `-C <arg>` repetitions
  // (a deliberate cross-repo form `repo-scope-discipline.md` MUST NOT §1 names).
  const MUTATE_VERB =
    /\b(rm|mv|cp|touch|mkdir|tee|gh|git\s+(?:-C\s+\S+\s+)*(?:add|commit|push|mv|rm|checkout|switch|reset|clean))\b/;
  const hasMutateVerb = MUTATE_VERB.test(bashCommand);
  const redirectTargets = fileRedirectTargets(bashCommand);
  // No mutate verb and no file-output redirect → read-only → never drift.
  if (!hasMutateVerb && redirectTargets.length === 0) return null;

  const cwd = projectDir || process.cwd();
  const cwdAbs = path.posix.normalize(cwd);
  // The cross-repo concern is a write into a SIBLING repo under the same parent
  // (e.g. ~/repos/loom when cwd is ~/repos/atelier). System paths (/tmp,
  // /dev/null, /usr), the filesystem root, and the repos-root itself are NOT
  // repo-scope drift — flagging them is noise that erodes the signal.
  const reposRoot = path.posix.dirname(cwdAbs);

  // A token is a sibling-repo path when it lives under the repos-root but
  // outside the cwd repo. Paths inside the cwd repo (including nested clones),
  // the repos-root itself, and system paths are all in-scope/out-of-concern.
  const isSibling = (tok) => {
    const abs = toAbsolute(tok);
    if (abs === cwdAbs || abs.startsWith(cwdAbs + "/")) return false;
    if (abs === reposRoot || !abs.startsWith(reposRoot + "/")) return false;
    return true;
  };

  // Channel 2: a file-redirect TARGET that is a sibling path always drifts,
  // regardless of whether the leading command is a read.
  for (const tgt of redirectTargets) {
    if (isSibling(tgt)) {
      return {
        type: "repo-scope-drift",
        detail: `write/mutate command targets sibling-repo path ${tgt} outside cwd repo ${cwdAbs}`,
        severity: "warn",
      };
    }
  }

  // Channel 1: a mutate verb puts every sibling-path argument at risk.
  if (hasMutateVerb) {
    for (const tok of absPathTokens(bashCommand)) {
      if (isSibling(tok)) {
        return {
          type: "repo-scope-drift",
          detail: `write/mutate command targets sibling-repo path ${tok} outside cwd repo ${cwdAbs}`,
          severity: "warn",
        };
      }
    }
  }
  return null;
}

/**
 * detectDestructiveBash — flags:
 *   (a) `rm -rf` of an absolute or home path, OR
 *   (b) `git reset --hard` / `git clean -f[d]` with NO `git status --porcelain`
 *       earlier in the SAME compound command (no porcelain safety check first).
 * Skips path tokens with unexpanded shell variables. WARN, never block.
 */
function detectDestructiveBash(bashCommand) {
  if (!bashCommand || typeof bashCommand !== "string") return null;

  // (a) rm -rf targeting an absolute/home path.
  // Match `rm` with combined/separate flags that include both r and f.
  const rmMatch = bashCommand.match(
    /\brm\s+(?:-\w*\s+)*-?\w*r\w*f\w*|\brm\s+(?:-\w*\s+)*-?\w*f\w*r\w*/i,
  );
  // Simpler robust check: rm present with both -r and -f among its flags.
  const hasRm = /\brm\b/.test(bashCommand);
  const rmFlags = bashCommand.match(/\brm\s+((?:-\S+\s+)+)/);
  let rmIsRecursiveForce = false;
  if (hasRm) {
    // Gather flag clusters after rm.
    const flagBlob =
      (bashCommand.match(/\brm\s+((?:-\S+\s*)+)/) || [])[1] || "";
    rmIsRecursiveForce = /r/.test(flagBlob) && /f/.test(flagBlob);
  }
  if (rmIsRecursiveForce || rmMatch) {
    for (const tok of absPathTokens(bashCommand)) {
      // tok already excludes shell-var tokens; absolute or ~ home path here.
      return {
        type: "destructive-bash",
        detail: `rm -rf targets absolute/home path ${tok}`,
        severity: "warn",
      };
    }
  }

  // (b) git reset --hard / git clean -f without a prior porcelain check in the
  //     same compound command.
  const RESET_HARD = /\bgit\s+reset\s+--hard\b/;
  const CLEAN_FORCE = /\bgit\s+clean\s+(?:-\w*f\w*|-f\w*|-\w*f)\b/;
  const dangerous =
    RESET_HARD.test(bashCommand) || CLEAN_FORCE.test(bashCommand);
  if (dangerous) {
    const PORCELAIN = /\bgit\s+status\s+--porcelain\b/;
    // The porcelain check must occur EARLIER in the command string than the
    // destructive verb. Compare first-match indices.
    const dangerIdx = (() => {
      const a = bashCommand.search(RESET_HARD);
      const b = bashCommand.search(CLEAN_FORCE);
      const idxs = [a, b].filter((n) => n >= 0);
      return Math.min.apply(null, idxs);
    })();
    const porcelainIdx = bashCommand.search(PORCELAIN);
    const porcelainFirst = porcelainIdx >= 0 && porcelainIdx < dangerIdx;
    if (!porcelainFirst) {
      return {
        type: "destructive-bash",
        detail:
          "git reset --hard / git clean -f without a preceding `git status --porcelain` safety check in the same command",
        severity: "warn",
      };
    }
  }

  return null;
}

/**
 * detectFalseCommitClaim — SEMANTIC judgement (does a commit message claim a
 * change the diff doesn't exhibit?). Per the substrate principles, semantics
 * are adjudicated by agents, not regex. No-op stub: always returns null.
 */
function detectFalseCommitClaim(_toolInput) {
  return null;
}

/**
 * detectTimePressureShortcut — lexical advisory signal: prompt text that frames
 * a time crunch to justify skipping rigor. WARN only; never used to block.
 */
const TIME_PRESSURE =
  /\b(?:in a (?:hurry|rush)|no time (?:to|for)|just (?:quickly|skip)|skip (?:the )?(?:tests?|review|vet|checks?)|don'?t bother (?:with )?(?:testing|reviewing|vetting)|we'?re short on time|asap|crunch(?:ed)?(?:\s+for\s+time)?|cut(?:ting)? corners?)\b/i;

function detectTimePressureShortcut(promptText) {
  if (!promptText || typeof promptText !== "string") return null;
  const m = promptText.match(TIME_PRESSURE);
  if (!m) return null;
  return {
    type: "time-pressure-shortcut",
    detail: `prompt contains time-pressure shortcut language: "${m[0].slice(0, 120)}"`,
    severity: "warn",
  };
}

/**
 * detectSweepSubstitution — lexical advisory signal: prompt text proposing a
 * cheap proxy in place of a mandated sweep/audit step. WARN only; never blocks.
 */
const SWEEP_SUBSTITUTION =
  /\b(?:instead of (?:a |the )?(?:full )?sweep|skip(?:ping)? the sweep|(?:just|only) (?:lint|cite-check|grep)(?: instead)?|in (?:place|lieu) of (?:the )?(?:sweep|audit)|substitut\w* (?:the )?(?:sweep|audit)|a (?:quick|cheap) (?:proxy|check) (?:instead|for the sweep))\b/i;

function detectSweepSubstitution(promptText) {
  if (!promptText || typeof promptText !== "string") return null;
  const m = promptText.match(SWEEP_SUBSTITUTION);
  if (!m) return null;
  return {
    type: "sweep-substitution",
    detail: `prompt proposes a cheap proxy in place of a mandated sweep: "${m[0].slice(0, 120)}"`,
    severity: "warn",
  };
}

module.exports = {
  detectRepoScopeDrift,
  detectDestructiveBash,
  detectFalseCommitClaim,
  // detectTimePressureShortcut + detectSweepSubstitution are exported,
  // fixture-tested, and gate-exercised (their probe counterparts in
  // audit-fixtures/violation-patterns/probes.md adjudicate live hits at
  // /cc-audit step 15) but deliberately NOT wired into a live hook: a lexical
  // prompt match carries no trust-moving weight on its own
  // (rules/probe-driven-verification.md MUST §4), so live wiring was excluded
  // from the GH #16 enforcement-engine scope by the operator's re-scope
  // disposition. The export is a test seam, not a live wire.
  detectTimePressureShortcut,
  detectSweepSubstitution,
};
