# ISSUES

Here are the open issues in the repo:

<issues-json>

!`gh issue list --state open --label ready-for-agent --json number,title,body,labels,comments,assignees,milestone --jq '[.[] | {number, title, body, labels: [.labels[].name], assignees: [.assignees[].login], milestone: .milestone.title, comments: [.comments[].body]}]'`

</issues-json>

The list above has been filtered by label only. Independently reject assigned
issues, open blockers, and tickets that do not satisfy
`docs/agents/agent-ready.md`.

# TASK

The parent PRD issue (if present) is documentation — do NOT include it as a work item in your plan. Only include actionable slice/implementation issues.

Analyze the issues and verify their declared dependency graph. Native GitHub
dependencies are canonical; the mirrored `Blocked by: #...` line must agree.

An issue B is **blocked by** issue A if:

- B requires code or infrastructure that A introduces
- B and A modify overlapping files or modules, making concurrent work likely to produce merge conflicts
- B's requirements depend on a decision or API shape that A will establish

An issue is **unblocked** only when every declared blocker is closed and it is
unassigned. Do not weaken or infer around an explicit blocker.

For each selected issue, assign a branch name using the format
`agent/issue-{id}-{slug}`.

# OUTPUT

Output your plan as a JSON object wrapped in `<plan>` tags:

<plan>
{"issues": [{"id": "42", "title": "Fix auth bug", "branch": "agent/issue-42-fix-auth-bug"}]}
</plan>

# SPRINT CONTEXT

When building the dependency graph, note which sprint each issue belongs to
(check for `phase-1`, `phase-2`, etc. labels). Prioritize issues in the
current phase first.

Include at most two unblocked, unassigned issues whose file ownership does not
overlap. If every issue is blocked or claimed, return an empty list. Never run a
blocked ticket merely because it has fewer dependencies.
