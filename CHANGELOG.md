# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Core runtime spine, memory system, tools, policy engine, audit logging, plugins, team mode
- Benchmarks and security checklist
- New setup wizard (`cellar-door setup`) with Quickstart + Advanced modes
- Optional `.env` storage for model credentials

### Changed
- Setup wizard now requires and stores the OpenAI API key during Quickstart
- Setup wizard fetches available models and forces selection via an interactive picker
- Model list fetch retries on transient errors and caches results locally
- Doctor validates Node.js >= 22 and missing env vars for model headers
- Runtime fails fast with a clear error when required env vars are missing

## [0.0.8] - 2026-02-04

### Changed
- Include provider error details in HTTP model errors to surface 400/401/429 reasons

## [0.0.9] - 2026-02-04

### Changed
- Include tool catalog and workspace context in model prompts
- Execute tool calls and feed results back to the model for a final response

## [0.0.10] - 2026-02-04

### Fixed
- Fix prompt memory reference in runtime builder

## [0.0.11] - 2026-02-04

### Fixed
- Robust parsing of model JSON responses to avoid leaking raw tool-call JSON

## [0.0.5] - 2026-02-03

### Added
- `cellar-door setup` as the primary onboarding command with a guided wizard
- Quickstart + Advanced model setup flows
- Optional `~/.cellar-door/.env` support for model credentials
- Environment variable expansion for model headers (e.g. `Bearer $OPENAI_API_KEY`)

### Changed
- `cellar-door init` now prompts to reconfigure when a config already exists

## [0.0.6] - 2026-02-03

### Changed
- Require Node.js >= 22 in engines and CI

## [0.0.3] - 2026-02-03

### Fixed
- Removed accidental self-dependency in `package.json` that could cause packaging/install issues
- Clarified local install vs `npx`/global usage in README

## [0.0.4] - 2026-02-03

### Added
- `cellar-door init --force` to re-run setup prompts when a config already exists
