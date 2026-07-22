# Sandcastle sandbox image — dual Kimi agent providers.
#
#   - Claude Code CLI (`claude`) — primary provider, pointed at Kimi's
#     Anthropic-compatible endpoint at runtime via ANTHROPIC_* env (main.mts)
#   - Kimi Code CLI (`kimi`) — native fallback provider, configured at runtime
#     via the KIMI_MODEL_* env channel (main.mts)
#   - GitHub CLI (`gh`), pnpm, Context7 MCP, Railway CLI + Claude Code skill
#
# Build with:
#   npx sandcastle docker build-image --dockerfile .sandcastle/Dockerfile
# build-image auto-detects your host UID/GID (id -u / id -g) and passes them as
# build args, so files created inside the container (worktrees, commits) are
# owned by you — cleanup and git work without sudo.
#
# Secrets are NEVER baked into this image. KIMI_API_KEY, GH_TOKEN,
# CONTEXT7_API_KEY and RAILWAY_TOKEN are injected at runtime from
# .sandcastle/.env (gitignored) by the orchestrator.

FROM node:22-bookworm

# 1. System deps.
RUN apt-get update && apt-get install -y \
      git \
      curl \
      jq \
    && rm -rf /var/lib/apt/lists/*

# 2. GitHub CLI (agents shell out to `gh` for issue read/close).
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
      | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
      | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
    && apt-get update && apt-get install -y gh \
    && rm -rf /var/lib/apt/lists/*

# 3. UID/GID alignment. `sandcastle docker build-image` auto-detects these from
#    the host; the defaults (1000:1000) are fallbacks for manual builds.
ARG AGENT_UID=1000
ARG AGENT_GID=1000

# Resolve the macOS GID-20 conflict: on macOS the host GID (staff) already
# exists in Debian as `dialout`. Force-delete the conflicting group so groupmod
# can reassign the GID to `node`, then rename the user to `agent`.
RUN if getent group $AGENT_GID >/dev/null; then \
      CONFLICT_GROUP=$(getent group $AGENT_GID | cut -d: -f1); \
      if [ "$CONFLICT_GROUP" != "node" ]; then \
        groupdel -f "$CONFLICT_GROUP" 2>/dev/null || true; \
      fi; \
    fi && \
    groupmod -g $AGENT_GID node && \
    usermod -u $AGENT_UID -g $AGENT_GID -d /home/agent -m -l agent node

# 4. Enable corepack as root (writes pnpm/yarn shims into the root-owned node bin).
RUN corepack enable

USER ${AGENT_UID}:${AGENT_GID}

# Pin pnpm 10 inside the sandbox image regardless of the repo's own pin.
RUN corepack prepare pnpm@10.33.2 --activate

# 5. Native Kimi Code CLI. Official npm package install, not the curl installer.
#    The API key is injected at run time through the KIMI_MODEL_* env channel in
#    main.mts, so config.toml never bakes secrets into the image.
RUN mkdir -p /home/agent/.local && \
    NPM_CONFIG_PREFIX=/home/agent/.local npm install -g @moonshot-ai/kimi-code

# Keep Kimi's runtime data under ~/.kimi so the sandcastle kimiCode provider's
# session-capture path and the CLI's KIMI_CODE_HOME agree.
ENV KIMI_CODE_HOME="/home/agent/.kimi"

# Minimal, secret-free config. Effort/model/window come from KIMI_MODEL_* env at
# runtime; thinking stays ON (disabling it silently routes K3 → K2.6).
RUN mkdir -p /home/agent/.kimi && \
    printf 'default_model = "k3"\ndefault_permission_mode = "auto"\ndefault_plan_mode = false\ntelemetry = false\n\n[thinking]\nenabled = true\neffort = "high"\nkeep = "all"\n\n[loop_control]\nreserved_context_size = 50000\n\n[background]\nkeep_alive_on_exit = true\nprint_wait_ceiling_s = 3600\n' > /home/agent/.kimi/config.toml && \
    printf '{"mcpServers":{"context7":{"command":"npx","args":["-y","@upstash/context7-mcp"]}}}\n' > /home/agent/.kimi/mcp.json

# 6. Claude Code CLI — the primary provider. The Kimi endpoint, API key, model
#    (k3[1m] / k3 / kimi-for-coding), window and effort all arrive at run time
#    via the ANTHROPIC_* / CLAUDE_CODE_* env injected by main.mts.
RUN curl -fsSL https://claude.ai/install.sh | bash

# Pre-complete Claude Code onboarding so `claude --print` runs headless from a
# cold HOME (the CLI refuses print mode until these flags exist).
RUN printf '{"penguinModeOrgEnabled":true,"hasCompletedOnboarding":true}\n' \
      > /home/agent/.claude.json

# Trust only the repository's named Context7 project server in headless runs.
# The same setting is committed at .claude/settings.json for non-container use;
# user scope here avoids a first-run project-MCP approval prompt in sandboxes.
RUN mkdir -p /home/agent/.claude && \
    printf '{"enableAllProjectMcpServers":false,"enabledMcpjsonServers":["context7"]}\n' \
      > /home/agent/.claude/settings.json

# 7. Railway CLI. Direct binary download: the npm package's postinstall 404s
#    on linux/arm64 (no aarch64-unknown-linux-gnu release asset); the musl
#    build is statically linked and runs fine on bookworm. Bump the pinned
#    version deliberately.
#    Auth via RAILWAY_TOKEN injected at runtime. The orchestrator also pins
#    RAILWAY_PROJECT_ID and RAILWAY_ENVIRONMENT_ID so CLI commands
#    deterministically target the right project — `railway list` does NOT work
#    with token auth (account-level listing needs OAuth), so always operate
#    against the pinned project/environment.
ARG RAILWAY_CLI_VERSION=5.27.0
RUN set -e; \
    case "$(uname -m)" in \
      aarch64) TRIPLE="aarch64-unknown-linux-musl" ;; \
      x86_64)  TRIPLE="x86_64-unknown-linux-gnu" ;; \
      *) echo "unsupported arch: $(uname -m)" >&2; exit 1 ;; \
    esac; \
    curl -fsSL "https://github.com/railwayapp/cli/releases/download/v${RAILWAY_CLI_VERSION}/railway-v${RAILWAY_CLI_VERSION}-${TRIPLE}.tar.gz" \
      | tar -xz -C /home/agent/.local/bin railway && \
    /home/agent/.local/bin/railway skills install --agent claude-code && \
    test -f /home/agent/.claude/skills/use-railway/SKILL.md

ENV PATH="/home/agent/.local/bin:${PATH}"

WORKDIR /home/agent

# 8. Sandcastle drives commands into the running container; keep it alive.
ENTRYPOINT ["sleep", "infinity"]
