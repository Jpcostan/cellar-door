# Contributing

Thanks for helping improve cellar-door.

## Ground rules
- Keep defaults safe (no silent permission widening).
- Add tests for new behavior.
- Update docs when user-facing behavior changes.

## Development

```bash
npm install
npm run lint
npm run typecheck
npm run test
npm run build
npm run smoke
```

## Release checklist

1. Ensure the CI pipeline is green on `main`.
2. Run `npm run release:check` locally.
3. Bump version and update `CHANGELOG.md`.
4. Publish to npm only after the pipeline passes.

## Reporting issues

Include:
- what you expected
- what happened
- repro steps
- environment (OS, Node version)
