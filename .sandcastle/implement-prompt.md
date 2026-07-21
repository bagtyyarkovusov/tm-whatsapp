# TASK

Fix issue {{TASK_ID}}: {{ISSUE_TITLE}}

Pull in the issue using `gh issue view {{TASK_ID}} --comments`. If it has a parent PRD, pull that in too.

Only work on the issue specified.

Work on branch {{BRANCH}}. Make commits and run tests.

Before editing, verify that the issue is unassigned and every `Blocked by:`
dependency is closed. Assign yourself and comment with this branch and a concise
execution plan. If the issue is already claimed, stop as incomplete.

# CONTEXT

Here are the last 10 commits:

<recent-commits>

!`git log -n 10 --format="%H%n%ad%n%B---" --date=short`

</recent-commits>

If this project has a `docs/adr/` directory, read any ADRs relevant to the area you're touching before making architectural decisions. Read the root `CONTEXT.md` if it exists, and use its glossary vocabulary in code, tests, and commit messages.

# EXPLORATION

Use `gh issue view {{TASK_ID}} --comments` to read the issue. Read every
repository-local PRD, ADR, contract, and path named by the issue. Do not rely on
another checkout being mounted in the container.

Run `scripts/agent-preflight.sh` before implementation. If the issue body
contains `requires_railway: true`, run `scripts/agent-preflight.sh --railway`
instead and use the `use-railway` skill for every Railway operation. Never touch
Railway production.

If you encounter unfamiliar libraries or need current API docs, use Context7: call `resolve-library-id` with the library name, then `query-docs` with your question.

Explore the repo and fill your context window with relevant information that will allow you to complete the task.

Pay extra attention to test files that touch the relevant parts of the code.

# EXECUTION

If applicable, use RGR to complete the task.

1. RED: write one test
2. GREEN: write the implementation to pass that test
3. REPEAT until done
4. REFACTOR the code

# FEEDBACK LOOPS

Before committing, run the project's own gates (typecheck, lint, tests — look at `package.json` scripts) and make sure they pass.

# COMMIT

Make a git commit. The commit message must:

1. Start with `RALPH:` prefix
2. Include task completed + PRD reference
3. Key decisions made
4. Files changed
5. Blockers or notes for next iteration

Keep it concise.

# THE ISSUE

If the task is not complete, leave a structured handoff comment with completed
work, failing evidence, and the smallest next action. Do not claim completion.

# CONTAINER LIMITATIONS

You are running inside a Linux Docker container WITHOUT:

- Docker (no building images or starting containers)
- iOS/Android native build tooling
- Ability to run long-running dev servers (Metro, Next.js dev, etc. block forever)

You DO have:

- Node.js 22, pnpm, git, curl, jq, gh, railway
- Full access to the repo code
- Ability to run builds, typecheck, lint, and unit tests
- Context7 MCP for querying library docs

Work within these constraints. Do not attempt to use tools that are not available.

When every agent-verifiable acceptance item is satisfied, output exactly:

`<agent-result>COMPLETE</agent-result>`

Otherwise output exactly:

`<agent-result>INCOMPLETE</agent-result>`

# FINAL RULES

ONLY WORK ON A SINGLE TASK.
