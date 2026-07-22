#!/usr/bin/env bash

set -euo pipefail

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "preflight failed: missing command '$1'" >&2
    exit 1
  fi
}

require_value() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "preflight failed: $name is not set" >&2
    exit 1
  fi
}

require_command git
require_command gh
require_command jq
require_command node
require_command pnpm
require_command claude

gh auth status >/dev/null 2>&1 || {
  echo "preflight failed: GitHub CLI is not authenticated" >&2
  exit 1
}

if [[ ! -f .mcp.json ]] || ! jq -e '.mcpServers.context7' .mcp.json >/dev/null; then
  echo "preflight failed: project Context7 MCP configuration is missing" >&2
  exit 1
fi

mcp_status="$(claude mcp list 2>&1)" || {
  echo "preflight failed: Claude Code could not list MCP servers" >&2
  exit 1
}
if ! grep -Eiq 'context7.*connected' <<<"$mcp_status"; then
  echo "preflight failed: Context7 is not connected" >&2
  exit 1
fi

if [[ "${1:-}" != "--railway" ]]; then
  echo "agent preflight passed"
  exit 0
fi

require_command railway
require_value RAILWAY_TOKEN
require_value RAILWAY_PROJECT_ID
require_value RAILWAY_ENVIRONMENT_ID

skill_path="${HOME:-/home/agent}/.claude/skills/use-railway/SKILL.md"
if [[ ! -f "$skill_path" ]]; then
  echo "preflight failed: Railway skill is missing at $skill_path" >&2
  exit 1
fi

session_id="${RAILWAY_AGENT_SESSION:-railway-skill-preflight}"
caller="skill:use-railway@1.1.3"
status_file="$(mktemp)"
trap 'rm -f "$status_file"' EXIT

RAILWAY_CALLER="$caller" RAILWAY_AGENT_SESSION="$session_id" \
  railway whoami --json >/dev/null
RAILWAY_CALLER="$caller" RAILWAY_AGENT_SESSION="$session_id" \
  railway status --json >"$status_file"

resolved_project_id="$(jq -r '.id // .project.id // .projectId // empty' "$status_file")"
resolved_environment_id="$(jq -r '.environment.id // .environmentId // empty' "$status_file")"
resolved_environment_name="$(jq -r '.environment.name // .environment // empty' "$status_file")"

if [[ -z "$resolved_project_id" || "$resolved_project_id" != "$RAILWAY_PROJECT_ID" ]]; then
  echo "preflight failed: Railway resolved an unexpected project" >&2
  exit 1
fi

if [[ -z "$resolved_environment_id" || "$resolved_environment_id" != "$RAILWAY_ENVIRONMENT_ID" ]]; then
  echo "preflight failed: Railway resolved an unexpected environment" >&2
  exit 1
fi

if [[ "$resolved_environment_name" != "development" ]]; then
  echo "preflight failed: Railway target is not the development environment" >&2
  exit 1
fi

echo "agent Railway preflight passed for the pinned non-production environment"
