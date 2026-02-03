# Phase 0 — Product Definition, Scope, and Threat Model

## Problem Statement
cellar-door is a local-first automation gateway + memory system for agents that can safely operate on the local machine using user-selected models, without unbounded context growth or unsafe defaults.

## Target Personas and Workflows
- Solo power user running locally via CLI, optionally enabling browser/desktop automation with explicit approvals.
- Team or shared agent deployment where models, memory access, and tool execution are governed, auditable, and default-denied.

## Explicit Non-Goals
- No always-on public servers or listeners.
- No implicit loading of large context or memory.
- No silent background control of the user’s machine.
- No forced cloud model dependency.
- No hard-coded LLM vendor in core logic.

## Threat Model and Trust Boundaries
- Local process vs. network exposure: prevent default network listeners and avoid untrusted inbound control.
- Tool execution risk: dangerous actions must be default-denied and approval-gated.
- Browser/UI control abuse: opt-in, visible, and fully logged.
- Model misuse or prompt-based escalation: model output cannot directly trigger side effects.
- Secret leakage: secrets must never be logged; access must be explicit and auditable.
- Unauthorized escalation of permissions: no silent escalation; all requests are visible and require approval.

## MVP Acceptance Criteria
- `npx cellar-door init` works and writes config to `~/.cellar-door/`.
- User can optionally configure a model provider during setup.
- `cellar-door run "<task>"` retrieves memory under a strict token budget. (Phase 2+.)
- Policy + approval gate blocks dangerous actions by default. (Phase 2+.)
- Browser automation requires explicit approval and is visible to the user. (Phase 2+.)
