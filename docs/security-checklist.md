# Security Checklist

Use this checklist before releases or major changes.

## Defaults
- [ ] No public network listeners are enabled by default
- [ ] Dangerous actions default-deny and require approval
- [ ] No silent permission escalation
- [ ] No implicit memory loading

## Tooling & Policy
- [ ] Tool schemas are validated at runtime
- [ ] Side-effect classes are declared for every tool
- [ ] Policy decisions are logged with reasons
- [ ] Approval prompts are interactive and time-bounded

## Data & Secrets
- [ ] Config and audit logs avoid secrets
- [ ] Access to secrets is explicit and auditable
- [ ] Session logs are append-only

## Model Governance
- [ ] Providers are only accessed via ModelProvider interface
- [ ] Approved provider list is enforced when configured
- [ ] Model output never triggers side effects directly

## Surfaces
- [ ] Browser/desktop automation is opt-in and visible
- [ ] Headless automation requires explicit approval
