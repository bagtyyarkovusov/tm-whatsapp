// Sandcastle orchestration — parallel planner + per-branch review loop,
// dual-provider on the Kimi Code API.
//
//   Phase 1 (Plan):    A planner reads the `ready-for-agent` issue queue,
//                      builds a dependency graph, and emits a <plan> JSON of
//                      unblocked issues + `agent/issue-<N>-<slug>` branches.
//   Phase 2 (Execute): One sandbox per issue (own Docker container + git
//                      worktree). The implementer runs first (≤100 iters); if it
//                      reports COMPLETE, an issue-aware reviewer runs in the
//                      same sandbox. At most two disjoint issues run together.
//   Phase 3 (Publish): Approved branches are pushed as one PR per issue. GitHub
//                      closes the issue only when that PR is later merged.
//
// Providers — pick one via SANDCASTLE_AGENT_PROVIDER in .sandcastle/.env:
//   claude-code  Claude Code CLI on Kimi's Anthropic-compatible endpoint (default)
//   kimi-code    Native Kimi Code CLI via its documented KIMI_MODEL_* env channel
//
// Both providers share the locked per-role matrix and the fallback ladder:
//
//   Role         Model            Effort   Context (default)   Override knob
//   reviewer     k3               high     1M                  SANDCASTLE_KIMI_WINDOW_REVIEWER
//   implementer  kimi-for-coding  —        256K                SANDCASTLE_KIMI_WINDOW_IMPLEMENTER
//   planner      kimi-for-coding  —        256K                SANDCASTLE_KIMI_WINDOW_PLANNER
//
// K2.7 Code (kimi-for-coding) has NO effort levels — Thinking is ON-only —
// so no effort knob is sent on K2.7 rungs; its 32K max output is pinned via
// CLAUDE_CODE_MAX_OUTPUT_TOKENS (claude-code provider only).
//
//   Ladder on HTTP 401 (plan lacks K3 or 1M entitlement) / 403 quota
//   exhaustion (per-model pools), both providers:
//     k3 role:   k3@<role-window> → k3@262144 → kimi-for-coding@262144
//     K2.7 role: kimi-for-coding@<role-window> → k3@262144
//
// Thinking stays ON everywhere — disabling it silently routes K3/K2.7 → K2.6.
//
// Run: `npm run sandcastle` (= tsx .sandcastle/main.mts). Set MAX_ITERATIONS=1
// for a smoke test. Requires .sandcastle/.env (see .env.example) and a running
// Docker daemon. Build the sandbox image first:
//   npx sandcastle docker build-image --dockerfile .sandcastle/Dockerfile

import * as sandcastle from "@ai-hero/sandcastle";
import { docker } from "@ai-hero/sandcastle/sandboxes/docker";
import {
  buildFallbackLadder,
  claudeModelForRung,
  claudeOnKimiEnv,
  effortForRung,
  isKimiEntitlementError,
  kimiCodeEnv,
  maxOutputTokensForRung,
  resolveRoleSpec,
  type AgentRole,
  type LadderRung,
} from "@ai-hero/sandcastle";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const readSandcastleEnv = async () => {
  const content = await readFile(".sandcastle/.env", "utf8").catch(() => "");
  const env: Record<string, string> = {};

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    const quoted =
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"));
    if (quoted) value = value.slice(1, -1);
    env[key] = value;
  }

  return env;
};

const HOST_ENV = { ...process.env, ...(await readSandcastleEnv()) };

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// plan→execute→publish cycles before stopping. Override for a quick smoke test:
//   MAX_ITERATIONS=1 npm run sandcastle
const MAX_ITERATIONS = Number(HOST_ENV.MAX_ITERATIONS ?? 10);
const MAX_CONCURRENT_ISSUES = Number(
  HOST_ENV.SANDCASTLE_MAX_CONCURRENT_ISSUES ?? 2,
);

const KIMI_API_KEY = HOST_ENV.KIMI_API_KEY;
if (!KIMI_API_KEY) {
  throw new Error(
    "KIMI_API_KEY is not set — add it to .sandcastle/.env (see .env.example).",
  );
}

type ProviderName = "claude-code" | "kimi-code";
const PROVIDER: ProviderName =
  (HOST_ENV.SANDCASTLE_AGENT_PROVIDER as ProviderName | undefined) ??
  "claude-code";
if (PROVIDER !== "claude-code" && PROVIDER !== "kimi-code") {
  throw new Error(
    `Unknown SANDCASTLE_AGENT_PROVIDER "${HOST_ENV.SANDCASTLE_AGENT_PROVIDER}" — want "claude-code" | "kimi-code".`,
  );
}

const IMPLEMENTER_IDLE_TIMEOUT_SECONDS = Number(
  HOST_ENV.SANDCASTLE_IMPLEMENTER_IDLE_TIMEOUT_SECONDS ?? 300,
);
const REVIEWER_IDLE_TIMEOUT_SECONDS = Number(
  HOST_ENV.SANDCASTLE_REVIEWER_IDLE_TIMEOUT_SECONDS ?? 180,
);

// ---------------------------------------------------------------------------
// Agent construction: per-role matrix + 401 fallback ladder (both providers)
// ---------------------------------------------------------------------------

const shellEscape = (value: string) => `'${value.replace(/'/g, "'\\''")}'`;

/**
 * Wrap a provider so its env is prefixed onto the print command (`env K=V …`).
 *
 * Why: top-level `sandcastle.run()` merges agent env into the container at
 * create time, but `createSandbox()` starts its long-lived container with
 * `agentProviderEnv: {}` — per-run agent env never reaches `sandbox.run()`
 * execs (docker exec inherits the container's env). Prefixing the command
 * delivers the correct per-role env on every run, including per-rung window
 * changes while descending the fallback ladder inside a shared sandbox.
 * (auto.tm-rewrite worked around the same gap with a custom buildPrintCommand.)
 */
const withProviderEnv = (
  provider: sandcastle.AgentProvider,
  env: Record<string, string>,
): sandcastle.AgentProvider => {
  const prefix = Object.entries(env)
    .map(([k, v]) => `${k}=${shellEscape(v)}`)
    .join(" ");
  return {
    ...provider,
    buildPrintCommand(opts) {
      const cmd = provider.buildPrintCommand(opts);
      return { ...cmd, command: `env ${prefix} ${cmd.command}` };
    },
  };
};

const agentAtRung = (
  role: AgentRole,
  rung: LadderRung,
): sandcastle.AgentProvider => {
  const spec = resolveRoleSpec(role, HOST_ENV);
  // Effort is K3-only: undefined on kimi-for-coding rungs (K2.7 has no
  // effort levels) and on the k3 fallback rung of an effort-less K2.7 role
  // (K3 then defaults server-side to high).
  const effort = effortForRung(spec, rung);

  if (PROVIDER === "kimi-code") {
    // Native CLI: window travels via KIMI_MODEL_MAX_CONTEXT_SIZE, effort via
    // KIMI_MODEL_THINKING_EFFORT. Model id stays `k3` (never the k3[1m] alias).
    const env = kimiCodeEnv({
      apiKey: KIMI_API_KEY!,
      model: rung.model,
      window: rung.window,
      effort,
    });
    return withProviderEnv(
      sandcastle.kimiCode(rung.model, { thinking: true, env }),
      env,
    );
  }

  // Claude Code on Kimi: every Claude model slot pins to the same Kimi model;
  // k3 above 256K is spelled `k3[1m]` (the alias opts into the 1M window).
  const model = claudeModelForRung(rung);
  const env = claudeOnKimiEnv({
    apiKey: KIMI_API_KEY!,
    model,
    window: rung.window,
    effort,
    // K2.7 caps output at 32K — pin it so Claude Code can't request more
    // than the model emits (k3 rungs stay unpinned; cap undocumented).
    maxOutputTokens: maxOutputTokensForRung(rung),
  });
  return withProviderEnv(
    sandcastle.claudeCode(model, { effort, env }),
    env,
  );
};

/**
 * Run `fn` with the role's agent, descending the fallback ladder on HTTP
 * 401/403-quota: k3 roles go k3@role-window → k3@262144 →
 * kimi-for-coding@262144; K2.7 roles fall back up to k3@262144.
 * Non-entitlement errors abort.
 */
const withLadder = async <T,>(
  role: AgentRole,
  fn: (agent: sandcastle.AgentProvider) => Promise<T>,
): Promise<T> => {
  const ladder = buildFallbackLadder(resolveRoleSpec(role, HOST_ENV));
  for (const [i, rung] of ladder.entries()) {
    if (i > 0) {
      console.warn(
        `[${role}] 401 from previous rung — falling back to ${rung.model}@${rung.window}.`,
      );
    }
    try {
      return await fn(agentAtRung(role, rung));
    } catch (error) {
      if (!isKimiEntitlementError(error) || i === ladder.length - 1) throw error;
    }
  }
  throw new Error("unreachable: ladder exhausted without throw");
};

// ---------------------------------------------------------------------------
// Git helpers (host-side)
// ---------------------------------------------------------------------------

const execGit = async (args: string[], options?: { cwd?: string }) =>
  execFileAsync("git", args, {
    maxBuffer: 10 * 1024 * 1024,
    ...options,
  });

const getCurrentHead = async () => {
  const { stdout } = await execGit(["rev-parse", "HEAD"]);
  return stdout.trim();
};

const branchExists = async (branch: string) => {
  try {
    await execGit(["show-ref", "--verify", "--quiet", `refs/heads/${branch}`]);
    return true;
  } catch {
    return false;
  }
};

const countUniqueCommits = async (baseHead: string, branch: string) => {
  const { stdout } = await execGit([
    "rev-list",
    "--count",
    `${baseHead}..${branch}`,
  ]);
  return Number(stdout.trim());
};

const slugIssueTitle = (title: string) =>
  title
    .replace(/^\s*S\d+\s*:\s*/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .split("-")
    .filter(Boolean)
    .slice(0, 6)
    .join("-");

const canonicalIssueBranch = (issue: { id: string; title: string }) =>
  `agent/issue-${issue.id}-${slugIssueTitle(issue.title)}`;

const RAILWAY_ENV_KEYS = [
  "RAILWAY_TOKEN",
  "RAILWAY_API_TOKEN",
  "RAILWAY_PROJECT_ID",
  "RAILWAY_ENVIRONMENT_ID",
  "RAILWAY_ENVIRONMENT",
  "RAILWAY_SERVICE_ID",
] as const;

const WITHOUT_RAILWAY_ENV = Object.fromEntries(
  RAILWAY_ENV_KEYS.map((key) => [key, ""]),
);

const issueRequiresRailway = async (issueId: string) => {
  const { stdout } = await execFileAsync("gh", [
    "issue",
    "view",
    issueId,
    "--json",
    "body",
    "--jq",
    ".body",
  ]);
  return /^requires_railway:\s*true\s*$/im.test(stdout);
};

const getWorktreeForBranch = async (branch: string) => {
  const { stdout } = await execGit(["worktree", "list", "--porcelain"]);
  const blocks = stdout.trim().split(/\n\n+/).filter(Boolean);
  const ref = `refs/heads/${branch}`;

  for (const block of blocks) {
    const lines = block.split("\n");
    const worktreeLine = lines.find((line) => line.startsWith("worktree "));
    const branchLine = lines.find((line) => line.startsWith("branch "));
    if (branchLine?.slice("branch ".length) === ref && worktreeLine) {
      return worktreeLine.slice("worktree ".length);
    }
  }
  return undefined;
};

const getDirtyStatus = async (worktreePath: string) => {
  const { stdout } = await execGit(["status", "--porcelain"], {
    cwd: worktreePath,
  });
  return stdout.trim();
};

/**
 * Reset a stale issue branch that has no unique commits, so a re-run starts
 * from the current HEAD instead of stacking on abandoned work. A previous
 * run's worktree may still have the branch checked out — git refuses to
 * force-update a checked-out branch, so the worktree goes first (only when
 * it's clean; a dirty one means real work, keep both).
 */
const prepareIssueBranch = async (issue: { id: string; branch: string }) => {
  if (!(await branchExists(issue.branch))) return;
  const baseHead = await getCurrentHead();
  if ((await countUniqueCommits(baseHead, issue.branch)) > 0) return;
  const { stdout: current } = await execGit(["branch", "--show-current"]);
  if (current.trim() === issue.branch) return;

  const worktreePath = await getWorktreeForBranch(issue.branch);
  if (worktreePath) {
    if (await getDirtyStatus(worktreePath)) {
      console.log(
        `[branch:${issue.branch}] keeping worktree with uncommitted changes at ${worktreePath}.`,
      );
      return;
    }
    console.log(
      `[branch:${issue.branch}] removing clean stale worktree before reset.`,
    );
    await execGit(["worktree", "remove", "--force", worktreePath]);
  }

  console.log(`[branch:${issue.branch}] resetting empty stale branch to HEAD.`);
  await execGit(["branch", "-f", issue.branch, baseHead]);
};

const publishIssuePullRequest = async (issue: {
  id: string;
  title: string;
  branch: string;
}) => {
  await execFileAsync("gh", ["auth", "setup-git"]);
  await execFileAsync("git", ["push", "--set-upstream", "origin", issue.branch]);

  const { stdout: existing } = await execFileAsync("gh", [
    "pr",
    "list",
    "--state",
    "open",
    "--head",
    issue.branch,
    "--json",
    "url",
    "--jq",
    ".[0].url // empty",
  ]);
  if (existing.trim()) {
    console.log(`PR already open for #${issue.id}: ${existing.trim()}`);
    return;
  }

  const { stdout: defaultBranch } = await execFileAsync("gh", [
    "repo",
    "view",
    "--json",
    "defaultBranchRef",
    "--jq",
    ".defaultBranchRef.name",
  ]);
  const { stdout: url } = await execFileAsync("gh", [
    "pr",
    "create",
    "--base",
    defaultBranch.trim(),
    "--head",
    issue.branch,
    "--title",
    `#${issue.id}: ${issue.title}`,
    "--body",
    `Closes #${issue.id}\n\nImplemented and independently reviewed by Sandcastle. The issue closes only when this PR merges.`,
  ]);
  console.log(`Published #${issue.id} for CI and merge review: ${url.trim()}`);
};

const checkGitHubBudget = async () => {
  const minCore = Number(HOST_ENV.SANDCASTLE_MIN_GH_CORE_REMAINING ?? 50);
  const minGraphql = Number(HOST_ENV.SANDCASTLE_MIN_GH_GRAPHQL_REMAINING ?? 50);

  const { stdout } = await execFileAsync(
    "gh",
    ["api", "rate_limit", "--jq", ".resources"],
    { maxBuffer: 1024 * 1024 },
  );
  const resources = JSON.parse(stdout) as {
    core?: { remaining: number; reset: number };
    graphql?: { remaining: number; reset: number };
  };

  const core = resources.core;
  const graphql = resources.graphql;
  if ((core && core.remaining < minCore) || (graphql && graphql.remaining < minGraphql)) {
    throw new Error(
      `GitHub API budget too low for a Sandcastle cycle (core=${core?.remaining ?? "?"}, graphql=${graphql?.remaining ?? "?"}). Wait for reset or lower SANDCASTLE_MIN_GH_*_REMAINING.`,
    );
  }
  console.log(
    `GitHub API budget ok: core=${core?.remaining ?? "unknown"}, graphql=${graphql?.remaining ?? "unknown"}.`,
  );
};

// ---------------------------------------------------------------------------
// Sandbox hooks: dependency install inside the worktree.
// ---------------------------------------------------------------------------
// Generic strategy: install from whatever manifest the branch contains. For a
// large monorepo, prefer the warm-store + copy-to-worktree pattern (see the
// fork's docs/agents/claude-code-on-kimi.md) instead of installing per sandbox.

const INSTALL_HOOK = {
  command: `bash -lc 'set -e; if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile; elif [ -f package-lock.json ]; then npm ci; elif [ -f package.json ]; then npm install; else echo "[sandcastle] no package manifest yet — skipping install"; fi'`,
  timeoutMs: 600_000,
};

// Speed up repeated runs by cloning the host node_modules into each worktree
// (the install hook reconciles any drift). Skipped when nothing is installed yet.
const copyToWorktree = existsSync("node_modules") ? ["node_modules"] : [];

const implementerHooks = { sandbox: { onSandboxReady: [INSTALL_HOOK] } };

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

console.log(
  `Provider: ${PROVIDER} | matrix: planner/implementer=kimi-for-coding@256K (no effort), reviewer=k3 high@1M | ladder: k3@1M → k3@256K → kimi-for-coding@256K (K2.7 roles: → k3@256K)`,
);

for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
  console.log(`\n=== Iteration ${iteration}/${MAX_ITERATIONS} ===\n`);

  await checkGitHubBudget();

  // -------------------------------------------------------------------------
  // Phase 1: Plan
  // -------------------------------------------------------------------------
  const plan = await withLadder("planner", (agent) =>
    sandcastle.run({
      sandbox: docker({ env: WITHOUT_RAILWAY_ENV }),
      name: "planner",
      maxIterations: 1,
      agent,
      promptFile: "./.sandcastle/plan-prompt.md",
    }),
  );

  // Extract the <plan>…</plan> block from the agent's stdout. Use the LAST
  // match: the planner's output may mention <plan> inline before the real block.
  const planMatches = [...plan.stdout.matchAll(/<plan>([\s\S]*?)<\/plan>/g)];
  const planBlock = planMatches[planMatches.length - 1]?.[1];
  if (!planBlock) {
    throw new Error(
      "Planning agent did not produce a <plan> tag.\n\n" + plan.stdout,
    );
  }

  const planJson = planBlock
    .replace(/```(?:json)?\s*/g, "")
    .replace(/\\n/g, "\n")
    .replace(/\\"/g, '"')
    .replace(/\\t/g, "\t")
    .trim();
  const parsedPlan = JSON.parse(planJson) as {
    issues: { id: string; title: string; branch: string }[];
  };
  // Canonicalize branch names so planner slug drift cannot create duplicates.
  const issues = parsedPlan.issues.slice(0, MAX_CONCURRENT_ISSUES).map((issue) => {
    const branch = canonicalIssueBranch(issue);
    if (issue.branch !== branch) {
      console.log(
        `Canonicalized planner branch for #${issue.id}: ${issue.branch} → ${branch}`,
      );
    }
    return { ...issue, branch };
  });

  if (issues.length === 0) {
    console.log("No unblocked issues to work on. Exiting.");
    break;
  }

  console.log(
    `Planning complete. ${issues.length} issue(s) to work in parallel:`,
  );
  for (const issue of issues) {
    console.log(`  ${issue.id}: ${issue.title} → ${issue.branch}`);
  }

  // -------------------------------------------------------------------------
  // Phase 2: Execute + Review (one sandbox per issue, shared by both roles)
  // -------------------------------------------------------------------------
  const settled = await Promise.allSettled(
    issues.map(async (issue) => {
      await prepareIssueBranch(issue);
      console.log(`[${issue.id}] creating sandbox for ${issue.branch}...`);
      const requiresRailway = await issueRequiresRailway(issue.id);
      const sandbox = await sandcastle.createSandbox({
        branch: issue.branch,
        sandbox: docker({
          env: requiresRailway ? {} : WITHOUT_RAILWAY_ENV,
        }),
        copyToWorktree,
        hooks: implementerHooks,
      });

      try {
        console.log(
          `[${issue.id}] implementer starting (idle timeout ${IMPLEMENTER_IDLE_TIMEOUT_SECONDS}s).`,
        );
        const implement = await withLadder("implementer", (agent) =>
          sandbox.run({
            name: "implementer",
            maxIterations: 100,
            completionSignal: [
              "<agent-result>COMPLETE</agent-result>",
              "<agent-result>INCOMPLETE</agent-result>",
            ],
            idleTimeoutSeconds: IMPLEMENTER_IDLE_TIMEOUT_SECONDS,
            agent,
            promptFile: "./.sandcastle/implement-prompt.md",
            promptArgs: {
              TASK_ID: issue.id,
              ISSUE_TITLE: issue.title,
              BRANCH: issue.branch,
            },
          }),
        );

        const implementationComplete =
          implement.completionSignal ===
          "<agent-result>COMPLETE</agent-result>";

        // Only review a committed result that explicitly claims completion.
        if (implementationComplete && implement.commits.length > 0) {
          console.log(
            `[${issue.id}] reviewer starting (idle timeout ${REVIEWER_IDLE_TIMEOUT_SECONDS}s).`,
          );
          const review = await withLadder("reviewer", (agent) =>
            sandbox.run({
              name: "reviewer",
              maxIterations: 1,
              completionSignal: [
                "<review-result>APPROVED</review-result>",
                "<review-result>REJECTED</review-result>",
              ],
              idleTimeoutSeconds: REVIEWER_IDLE_TIMEOUT_SECONDS,
              agent,
              promptFile: "./.sandcastle/review-prompt.md",
              promptArgs: {
                TASK_ID: issue.id,
                ISSUE_TITLE: issue.title,
                BRANCH: issue.branch,
              },
            }),
          );

          return {
            approved:
              review.completionSignal ===
              "<review-result>APPROVED</review-result>",
            commits: [...implement.commits, ...review.commits],
          };
        }

        console.warn(
          `[${issue.id}] not publishable: implementation did not explicitly complete with commits.`,
        );
        return { approved: false, commits: implement.commits };
      } finally {
        await sandbox.close();
      }
    }),
  );

  for (const [i, outcome] of settled.entries()) {
    if (outcome.status === "rejected") {
      console.error(
        `  ✗ ${issues[i]!.id} (${issues[i]!.branch}) failed: ${outcome.reason}`,
      );
    }
  }

  // Only explicitly completed and independently approved branches are published.
  const approvedIssues = settled
    .map((outcome, i) => ({ outcome, issue: issues[i]! }))
    .filter(
      (entry) =>
        entry.outcome.status === "fulfilled" &&
        entry.outcome.value.approved &&
        entry.outcome.value.commits.length > 0,
    )
    .map((entry) => entry.issue);

  console.log(
    `\nExecution complete. ${approvedIssues.length} approved branch(es):`,
  );
  for (const issue of approvedIssues) {
    console.log(`  #${issue.id}: ${issue.branch}`);
  }

  if (approvedIssues.length === 0) {
    console.log("No approved branches. Nothing to publish.");
    continue;
  }

  // -------------------------------------------------------------------------
  // Phase 3: Publish one pull request per issue
  // -------------------------------------------------------------------------
  for (const issue of approvedIssues) {
    await publishIssuePullRequest(issue);
  }

  console.log("\nApproved issue PRs published. Issues remain open until merge.");
}

console.log("\nAll done.");
