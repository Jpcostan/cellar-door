# celler-door

**Local-first automation gateway + memory system for agents** — powerful for solo power users, safe and auditable for teams.

Unlike "markdown memory" systems that bloat over time and burn tokens on every run, celler-door uses **retrieval + compaction**:

- Keep a tiny always-loaded bootstrap
- Store everything else as atomic "memory cards"
- Retrieve only what's relevant under a strict token budget
- Compact session logs into summaries automatically

> Default posture: **no public ports**, **default-deny** for dangerous actions, and **explainable policies**.

---

## Features

### Local-first by default

Runs entirely on your machine. State lives in `~/.celler-door/`. Network surfaces are optional and treated as plugins/transports.

### Token-efficient memory

- Append-only session logs for audit and debug
- Automatic compaction into `hot.md` (hard-capped), atomic memory cards (facts/lessons/decisions), and an indexed store (JSON or SQLite)
- Strict token budgets so memory never "runs away"

### Safe tool execution

- Tools are schema-defined (JSON Schema) with a declared **side-effect class**
- Policies can allow/deny per tool, filesystem path scope, network domain allowlist, or exec enablement
- Interactive approvals for high-risk actions

### Team-ready

- Namespaced memory scopes: `org/`, `team/`, `project/`, `user/`
- Audit logs for tool calls, approvals, and denials
- Shared config/memory via local shared directories for small teams

---

## Install

### Run without installing (recommended to start)

```bash
npx celler-door init
npx celler-door doctor
```

### Install globally

```bash
npm install -g celler-door
celler-door --help
```

---

## Quickstart

**Initialize:**

```bash
celler-door init
```

**Run a task:**

```bash
celler-door run "Summarize the repo and tell me where env vars are configured"
```

**Search memory:**

```bash
celler-door memory search "ssh key"
```

**Compact memory (manual trigger):**

```bash
celler-door memory compact
```

---

## CLI Commands

| Command | Description |
|---------|-------------|
| `celler-door init` | Create config + local storage directory and run first-time setup |
| `celler-door run "<task>"` | Execute a task using retrieval + tools + policy gating |
| `celler-door memory add\|search\|compact\|gc` | Manage memory cards, retrieve knowledge, compact logs, garbage collect |
| `celler-door policy check\|explain\|approve` | Inspect/test policies and approve gated actions |
| `celler-door tool list\|describe` | List available tools and show schemas + side-effect classes |
| `celler-door plugin add\|remove\|list` | Install and manage plugins |

---

## Architecture

### Components

| Component | Role |
|-----------|------|
| **CLI** | User-facing interface; renders approvals interactively; supports `--json` for scripting |
| **Core Runtime** | Orchestrates the agent loop: parse task → retrieve memory → plan + invoke tools → log traces + outcomes |
| **Memory Store** | Append-only session logs, compaction pipeline, memory cards + index, retrieval ranking and token budgeting |
| **Tool Registry + Execution** | Schema-defined tools with side-effect classes (`read_only`, `writes_files`, `network`, `exec`, `money`, `admin`); enforced through the policy engine |
| **Policy Engine** | Default-deny on risky classes; capability checks for file path scopes, domain allowlists, tool permissions; explainable deny reasons |
| **Transports / Surfaces** *(optional)* | Telegram, Slack, Web UI, etc. — implemented as plugins; never forces the core to bind publicly |

### Request flow

```
User → CLI → Core Runtime
              ├─→ Memory Retrieval (budgeted)
              ├─→ Policy Check
              ├─→ Tool Calls (schema validated)
              ├─→ Results
              ├─→ Audit + Session Log
              └─→ Compaction (when needed)
```

---

## Memory & Context Model

### Why not "load markdown files into the prompt"?

Because memory grows unbounded and becomes a recurring token tax.

### celler-door's approach

| Layer | Description |
|-------|-------------|
| **Bootstrap** (always loaded, tiny) | Identity + policies + project brief. Capped by config (recommended 1–3k tokens). |
| **Hot memory** (always available, hard-capped) | Rolling summary of the most important, recent facts and decisions. |
| **Warm memory** (retrieved on demand) | Atomic "memory cards" with tags and metadata. Retrieved by relevance under a strict budget — never loaded wholesale. |
| **Cold memory** (audit/debug only) | Raw session logs, archived segments. Never injected automatically. |

### Storage layout

```
~/.celler-door/
├── bootstrap/
│   ├── identity.md
│   ├── policies.md
│   └── project_brief.md
├── memory/
│   ├── hot.md
│   ├── cards/
│   │   ├── mem_2026_02_02_001.md
│   │   └── mem_2026_02_02_002.md
│   └── index.json              # or index.sqlite
├── sessions/
│   └── 2026-02-02.md           # append-only log (raw)
├── audit/
│   └── audit.log               # tool calls + approvals + denials
└── config.json
```

### Memory card format

```yaml
---
id: mem_2026_02_02_001
type: lesson              # fact | lesson | decision | snippet
tags: [ssh, security]
scope: project            # org | team | project | user
importance: 0.7           # 0..1
created_at: 2026-02-02
---
Keep private SSH keys local. Put public keys in authorized_keys on the remote.
```

### Retrieval & token budgeting

At runtime, celler-door selects the top-K memory cards by tag overlap, recency decay, importance, and scope match (`project > team > org` unless overridden). It then enforces a token budget:

- **Bootstrap:** fixed cap
- **Retrieved memories:** fixed cap
- **Remaining context:** the conversation + task

---

## Security Defaults

- **No public ports** by default
- **Default-deny** for `exec`, network to non-allowlisted domains, and writes outside scoped paths
- **Explainable policies:** denials include "why" and which policy blocked the action
- **Secrets:** env vars and config can be redacted from logs; "do not store" markers supported (planned)

---

## Configuration

`~/.celler-door/config.json` example:

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

## Plugins

Plugins can add:

- **Tools** — with schemas + side-effect classes
- **Surfaces / Transports** — Telegram, Slack, etc.
- **Memory providers** — SQLite, embeddings, etc.

Plugin API is versioned. Breaking changes require a major version bump.

---

## Development

```bash
npm install
npm run build
npm link
celler-door --help
```

Run tests:

```bash
npm test
```

---

## Roadmap

- [ ] Signed plugins + trusted publisher keys
- [ ] Optional embeddings-based recall (pluggable)
- [ ] Improved sandboxing (worker isolation)
- [ ] Team sync enhancements + conflict resolution
- [ ] Web UI surface (optional)

---

## Contributing

PRs welcome. Please:

- Open an issue for new features
- Include tests for retrieval/compaction changes
- Keep defaults safe — no widening permissions silently

---

## License

MIT
