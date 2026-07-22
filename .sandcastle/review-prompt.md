# TASK

Review issue #{{TASK_ID}} ({{ISSUE_TITLE}}) on branch `{{BRANCH}}`.
This is a read-only review. Do not edit files or create commits; any reviewer
commit makes the result unpublishable until another independent review runs.

Fetch the current issue body and comments. Review the implementation against
every agent-verifiable acceptance item, not merely against the diff. Confirm
that declared blockers were closed before work began and that no human-only
validation was silently substituted.

# CONTEXT

## Branch diff

!`git diff {{TARGET_BRANCH}}...{{BRANCH}}`

## Commits on this branch

!`git log {{TARGET_BRANCH}}..{{BRANCH}} --oneline`

# REVIEW PROCESS

1. **Understand the change**: Read the issue, diff, and commits to understand the intent.

2. **Analyze for improvements**: Look for opportunities to:
   - Reduce unnecessary complexity and nesting
   - Eliminate redundant code and abstractions
   - Improve readability through clear variable and function names
   - Consolidate related logic
   - Remove unnecessary comments that describe obvious code
   - Avoid nested ternary operators - prefer switch statements or if/else chains
   - Choose clarity over brevity - explicit code is often better than overly compact code

3. **Check correctness**:
   - Does the implementation match the intent? Are edge cases handled?
   - Are new/changed behaviours covered by tests?
   - Are there unsafe casts, `any` types, or unchecked assumptions?
   - Does the change introduce injection vulnerabilities, credential leaks, or other security issues?
   - Does the change respect any relevant ADRs in `docs/adr/` and the glossary in `CONTEXT.md`?
   - If the change uses libraries or frameworks, verify the implementation against current docs — use Context7 (`resolve-library-id` / `query-docs`) if something looks off or uses deprecated APIs.

4. **Maintain balance**: Avoid over-simplification that could:
   - Reduce code clarity or maintainability
   - Create overly clever solutions that are hard to understand
   - Combine too many concerns into single functions or components
   - Remove helpful abstractions that improve code organization
   - Make the code harder to debug or extend

5. **Apply project standards**: Follow the coding standards defined in @.sandcastle/CODING_STANDARDS.md

6. **Preserve functionality**: Never change what the code does - only how it does it. All original features, outputs, and behaviors must remain intact.

# EXECUTION

If you find improvements to make:

1. Make the changes directly on this branch
2. Run tests and type checking to ensure nothing is broken
3. Commit describing the refinements

# CONTAINER LIMITATIONS

Both the implementer and reviewer run inside the same Linux Docker container.
The code must work without:

- Docker, iOS/Android native builds, or long-running dev servers
- Host services or external APIs not available in the container

Verify the implementation respects these constraints.

# MERGE GATE CHECKLIST

Before approving this branch for merge, verify ALL of the following:

1. The project's own typecheck passes with zero errors (look at `package.json` scripts — e.g. `pnpm typecheck` / `npm run typecheck`)
2. Relevant builds pass for the packages this branch touched
3. Relevant tests pass
4. No `.env`, `.env.local`, or secrets files were added to git
5. The lockfile is updated if any `package.json` changed
6. No generated directories (`.next/`, `.expo/`, `dist/`, `android/`, `ios/`) were committed
7. The change respects relevant ADRs in `docs/adr/`

If ANY check or acceptance item fails, reject the PR and output the exact errors.
An implementer statement such as "not tested", a substituted acceptance check,
or a missing required deployment is a rejection.

Approve only when every check passes by outputting exactly:

`<review-result>APPROVED</review-result>`

Otherwise output exactly:

`<review-result>REJECTED</review-result>`
