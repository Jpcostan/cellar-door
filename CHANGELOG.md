# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Core runtime spine, memory system, tools, policy engine, audit logging, plugins, team mode
- Benchmarks and security checklist

## [0.0.3] - 2026-02-03

### Fixed
- Removed accidental self-dependency in `package.json` that could cause packaging/install issues
- Clarified local install vs `npx`/global usage in README

## [0.0.4] - 2026-02-03

### Added
- `cellar-door init --force` to re-run setup prompts when a config already exists
