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

## [0.0.5] - 2026-02-03

### Added
- `cellar-door setup` as the primary onboarding command with a guided wizard
- Quickstart + Advanced model setup flows
- Optional `~/.cellar-door/.env` support for model credentials
- Environment variable expansion for model headers (e.g. `Bearer $OPENAI_API_KEY`)

### Changed
- `cellar-door init` now prompts to reconfigure when a config already exists

## [0.0.3] - 2026-02-03

### Fixed
- Removed accidental self-dependency in `package.json` that could cause packaging/install issues
- Clarified local install vs `npx`/global usage in README

## [0.0.4] - 2026-02-03

### Added
- `cellar-door init --force` to re-run setup prompts when a config already exists
