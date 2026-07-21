# Agent-ready issue contract

`ready-for-agent` is an execution guarantee, not a priority hint. An issue may
carry the label only when a fresh Sandcastle Claude Code session can complete
and verify it without inventing a product decision or waiting for a human.

## Required issue structure

Every agent-ready issue contains these sections:

1. **Outcome** — one observable result.
2. **In scope** — exact behavior, modules, routes, events, and schema owned.
3. **Out of scope** — adjacent work deliberately excluded.
4. **Decisions already settled** — libraries or research outcome, contracts,
   privacy/security rules, failure behavior, and environment variable names.
5. **Dependencies** — `Blocked by: #...` mirrored by native GitHub dependency
   edges. Every blocker must be closed before the label is applied.
6. **Local context** — repository-local PRDs, ADRs, and contracts. A ticket may
   not depend on another checkout being mounted in the sandbox.
7. **Agent environment** — required commands, credentials, allowed mutations,
   forbidden environments, and the preflight command.
8. **Acceptance — agent-verifiable** — checkboxes with exact commands and
   observable results.
9. **Human validation** — must say `None`. Physical devices, signing accounts,
   dashboards, and store consoles belong in a separate `ready-for-human` issue.
10. **Rollback and observability** — mandatory for migrations, queues,
    infrastructure, and deployments.

## Readiness gate

Before applying `ready-for-agent`, verify all of the following:

- [ ] The outcome is one coherent, independently reviewable behavior.
- [ ] No unresolved `decide in PR`, research fork, or product choice remains.
- [ ] Native dependencies and the mirrored `Blocked by:` line agree.
- [ ] All blockers are closed and the issue is unassigned.
- [ ] Every normative reference exists in this repository.
- [ ] `scripts/agent-preflight.sh` passes in a fresh Sandcastle image.
- [ ] `scripts/agent-preflight.sh --railway` passes when
      `requires_railway: true` is declared.
- [ ] Acceptance is possible in the Linux sandbox; no device/store action is
      hidden in the ticket.
- [ ] Tests, root gates, documentation changes, and completion evidence are
      explicit.
- [ ] Parallel tickets do not share a single-writer surface without an edge.

Ideal size is one to three focused commits and one independently reviewable
acceptance suite. Parent integration/tracking issues do not receive
`ready-for-agent`.

## Agent execution rules

An agent claims an unassigned frontier issue, assigns itself, and comments with
its `agent/issue-<number>-<slug>` branch before editing. It stops and applies
`needs-info` when a decision is missing, or `ready-for-human` when access or
physical validation is missing.

Completion requires:

- every agent-verifiable checkbox satisfied;
- relevant build, typecheck, lint, format, and tests passing;
- remote CI and required development deployment succeeding;
- an independent issue-aware review approving the work;
- a closing comment mapping evidence to each acceptance item.

A commit is not proof of completion. Partial work remains open with a structured
handoff.
