# cellar-door

**Local-first automation gateway + memory system for agents** — model-agnostic, safe by default, and auditable.

cellar-door is designed for power users and teams who want automation and memory without opaque behavior or runaway context. It is **retrieve-first**, **default-deny**, and **explicit about side effects**.

---

## Why cellar-door

Most agent tools either:
- load too much context, burning tokens and slowing down over time
- hide or bypass dangerous actions
- lock you into a specific model vendor

cellar-door fixes this by enforcing **retrieval over loading**, **policy-gated tool execution**, and **provider-agnostic model access**.

---

## Core Principles

- **Retrieve, don’t load.** Memory is retrieved under a strict token budget.
- **Default-deny dangerous actions.** Side effects require explicit approval.
- **Make power visible and auditable.** Every tool call is logged with intent and outcome.
- **Model-agnostic by design.** Bring your own model (cloud or local).
- **No silent escalation.** Permissions are explicit and time-bounded.

---

## Features (Current + Planned)

### Local-first by default
- Runs entirely on your machine.
- State lives in `~/.cellar-door/`.
- No public listeners unless explicitly enabled.

### Token-efficient memory
- Append-only session logs for audit and debug.
- Automatic compaction into `hot` memory and atomic memory cards.
- Retrieval ranks by relevance, recency, importance, and scope.
- Strict token budgets per memory layer.

### Safe tool execution
- Tools are schema-defined with a declared **side-effect class**.
- Policies allow/deny by tool, path, or network domain.
- Interactive approvals for high-risk actions.

### Team-ready controls
- Namespaced memory scopes (`org/`, `team/`, `project/`, `user/`).
- Audit logs for tool calls and approvals.
- Default-deny posture suitable for shared environments.

---

## Installation

### Run without installing
```bash
npx cellar-door init
npx cellar-door doctor
```

### Install globally
```bash
npm install -g cellar-door
cellar-door --help
```

---

## Quickstart

Initialize config:
```bash
cellar-door init
```

Check environment and config:
```bash
cellar-door doctor
```

---

## CLI Commands (Phase 1)

| Command | Description |
| --- | --- |
| `cellar-door init` | Initialize config and local data directory |
| `cellar-door doctor` | Verify environment and config |
| `cellar-door version` | Print installed version |

> Additional commands (`run`, `memory`, `policy`, `tool`, `plugin`) are planned for Phase 2+.

---

## Memory Model (Design)

### Layers
- **Bootstrap**: always loaded, tiny, identity and policies.
- **Hot**: always available, hard-capped summary of recent context.
- **Warm**: retrieved on demand under strict budget.
- **Cold**: audit-only, never injected.

### Storage layout (planned)
```
~/.cellar-door/
├── bootstrap/
│   ├── identity.md
│   ├── policies.md
│   └── project_brief.md
├── memory/
│   ├── hot.md
│   ├── cards/
│   │   ├── mem_2026_02_02_001.md
│   │   └── mem_2026_02_02_002.md
│   └── index.json
├── sessions/
│   └── 2026-02-02.md
├── audit/
│   └── audit.log
└── config.json
```

### Memory card format (planned)
```yaml
---
id: mem_2026_02_02_001
type: lesson
scope: project
importance: 0.7
created_at: 2026-02-02
tags: [ssh, security]
---
Keep private SSH keys local. Put public keys in authorized_keys on the remote.
```

---

## Architecture (Planned)

### Components
- **CLI**: user interface with `--json` output for scripting.
- **Core Runtime**: orchestrates task execution and retrieval.
- **Memory Store**: cards, summaries, and audit logs.
- **Tool Registry + Execution**: schema-validated tools with side-effect classes.
- **Policy Engine**: default-deny gating with explainable decisions.
- **Optional Surfaces**: plugins (Slack, Web UI, etc.) with no required listeners.

### Request flow
```
User → CLI → Runtime
              ├─→ Memory Retrieval (budgeted)
              ├─→ Policy Check
              ├─→ Tool Calls (schema validated)
              ├─→ Results
              ├─→ Audit + Session Log
              └─→ Compaction (when needed)
```

---

## Configuration

Example `~/.cellar-door/config.json` (future schema may evolve):
```json
{
  "workspaceRoot": "~/dev/my-project",
  "tokenBudgets": {
    "bootstrapMax": 2000,
    "retrievedMemoryMax": 2500
  },
  "network": {
    "allowDomains": ["api.github.com", "docs.company.com"]
  },
  "tools": {
    "execEnabled": false
  }
}
```

---

## Development

```bash
npm install
npm run lint
npm run typecheck
npm run test
npm run build
npm run smoke
```

---

## Roadmap (High level)

- Model-agnostic provider interface + runtime spine
- Retrieval-based memory store with compaction
- Policy engine and tool registry
- Optional plugin system and surfaces

---

## License

MIT
