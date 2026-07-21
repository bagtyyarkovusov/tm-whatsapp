# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

Additional workflow labels:

| Label | Meaning |
| --- | --- |
| `blocked` | At least one native/declared dependency remains open |
| `phase-1` | Part of the Phase 1 release tree |
| `priority:p0` | Release/security blocker |
| `priority:p1` | Required Phase 1 work |
| `priority:p2` | Phase 1 polish that does not open the main frontier |

Area labels use the `area:<name>` form. They identify the owning surface but do
not imply readiness.

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

Edit the right-hand column to match whatever vocabulary you actually use.
