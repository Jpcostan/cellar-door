# cellar-door

![CI](https://github.com/Jpcostan/cellar-door/actions/workflows/ci.yml/badge.svg)

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

## Installation

### Run without installing
```bash
npx cellar-door init
npx cellar-door doctor
```

### Install locally (project-only)
```bash
npm install cellar-door
npm exec -- cellar-door init
```

You can also run the local binary directly:
```bash
./node_modules/.bin/cellar-door init
```

### Install globally
```bash
npm install -g cellar-door
cellar-door --help
```

---

## Setup (Local)

cellar-door is local-first. Configuration and data live in `~/.cellar-door/`.

1) Initialize config:
```bash
cellar-door init
```

2) Configure a model provider in `~/.cellar-door/config.json`:

**OpenAI-compatible HTTP**
```json
{
  "version": 1,
  "modelProvider": {
    "kind": "http",
    "baseUrl": "https://api.openai.com/v1",
    "model": "gpt-4o-mini",
    "headers": { "Authorization": "Bearer $OPENAI_API_KEY" }
  }
}
```

**Ollama**
```json
{
  "version": 1,
  "modelProvider": {
    "kind": "ollama",
    "model": "llama3"
  }
}
```

**LM Studio**
```json
{
  "version": 1,
  "modelProvider": {
    "kind": "lmstudio",
    "model": "local-model"
  }
}
```

3) (Optional) Set policy and tooling defaults:
```json
{
  "approvedModelProviders": ["http", "ollama", "lmstudio"],
  "workspaceRoot": "~/dev/my-project",
  "userIdentity": "alice",
  "network": { "allowDomains": ["api.github.com"] },
  "tools": {
    "execEnabled": false,
    "browserEnabled": false,
    "browserHeadless": false,
    "desktopEnabled": false
  },
  "policy": {
    "allowTools": ["fs.read", "git.status"],
    "allowDomains": ["api.github.com"],
    "allowUi": false,
    "allowDesktop": false,
    "allowHeadless": false
  },
  "tokenBudgets": {
    "bootstrapMax": 2000,
    "hotMax": 1500,
    "warmMax": 2500
  }
}
```

---

## Quickstart

```bash
cellar-door init
cellar-door doctor
cellar-door run "Summarize the repo"
```

---

## CLI Commands

| Command | Description |
| --- | --- |
| `cellar-door init` | Initialize config and local data directory |
| `cellar-door doctor` | Verify environment and config |
| `cellar-door version` | Print installed version |
| `cellar-door run "<task>"` | Execute a task using retrieval and policy gating |
| `cellar-door memory add|search|compact|gc` | Manage memory cards, retrieval, and compaction |
| `cellar-door tool list|describe` | Inspect built-in tools and schemas |
| `cellar-door policy check|explain|approve` | Inspect and reason about policy decisions |
| `cellar-door audit tail` | View recent audit log entries |
| `cellar-door plugin add|remove|list|verify|template` | Manage plugins and scaffold new ones |
| `cellar-door team init|join|sync` | Configure shared team directory |

---

## How It Works

**Runtime flow**
```
User → CLI → Runtime
              ├─→ Memory Retrieval (budgeted)
              ├─→ Policy Check
              ├─→ Tool Calls (schema validated)
              ├─→ Results
              ├─→ Audit + Session Log
              └─→ Compaction (when needed)
```

**Memory model**
- **Bootstrap** (tiny, always loaded)
- **Hot** (hard-capped summary)
- **Warm** (retrieved on demand)
- **Cold** (audit only, never injected)

**Tooling model**
- Tools are schema-defined and classified by side-effect class.
- Policies allow/deny per tool/path/domain/UI.
- Approvals are time-bounded and audited.

---

## Memory Model (Design)

### Storage layout
```
~/.cellar-door/
├── bootstrap/
├── memory/
│   ├── hot.md
│   ├── cards/
│   └── index.json
├── sessions/
├── audit/
└── config.json
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

## Benchmarks

```bash
npm run bench:retrieval
npm run bench:tokens
```

## Security Checklist

```bash
npm run security:check
```

---

## Publishing (npm)

This repo is configured for a public npm package with a `files` whitelist. Publishing runs tests and build automatically:

```bash
npm publish
```

---

## Docs & Community

- `CHANGELOG.md`
- `CONTRIBUTING.md`
- `docs/recipes/`

---

## License

MIT
