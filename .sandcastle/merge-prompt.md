# TASK

Merge the following branches into the current branch:

{{BRANCHES}}

For each branch:

1. Run `git merge <branch> --no-edit`
2. If there are merge conflicts, resolve them intelligently by reading both sides and choosing the correct resolution
3. After resolving conflicts, run the project's own gates (typecheck, tests — look at `package.json` scripts) to verify everything works
4. If tests fail, fix the issues before proceeding to the next branch

After all branches are merged, make a single commit summarizing the merge.

# CLOSE ISSUES

For each branch that was merged, close its issue using the following command:

`gh issue close <ID> --comment "Completed by Sandcastle"`

Here are all the issues:

{{ISSUES}}

# ISSUE HIERARCHY ANALYSIS

Before closing any issues, you MUST understand the dependency graph:

1. Fetch ALL open issues: `gh issue list --state open --json number,title,body,labels`
2. For each open issue, scan its body for "Depends on #<number>" references
3. Build a map of which issues are blocked by which

# SAFE UNBLOCKING RULE

After closing an issue, only remove the `blocked` label
from another issue if ALL of its "Depends on" references now point to CLOSED issues.

Command to remove blocked label: `gh issue edit <id> --remove-label blocked`

If an issue depends on multiple issues and only one was closed, DO NOT unblock it.

# BUILD COMMANDS

Use the repo's own package manager and scripts (check `package.json`, and
`pnpm-workspace.yaml` / `turbo.json` if present). Typical gates:

- `pnpm typecheck` / `npm run typecheck` — typecheck all packages
- `pnpm --filter <pkg> build` / `npm run build` — build what changed
- `pnpm --filter <pkg> test` / `npm test` — test what changed

# VALIDATION

You operate on the main branch inside a container. Validate the merged code
with whatever the repo supports in-container: typecheck, unit tests, builds.
Do NOT rely on Docker-in-Docker, long-running dev servers, or host services —
if the repo's e2e suite needs those, note it in your summary and leave it to CI.

# SUMMARY

After merging, output:

- Which issues were merged and closed
- Which issues were unblocked (blocked label removed)
- Which issues remain blocked and why

Once you've merged everything you can, output <promise>COMPLETE</promise>.
