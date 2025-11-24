# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-24

### Added

#### Core Features
- **Mission Definer**: Define tasks with goal descriptions, validation strategies, and success criteria
- **Attempt Counter**: Configurable retry limits with automatic loop prevention
- **Feedback Engine**: Dynamic, actionable feedback generation for failed attempts
- **State Manager**: Persistent mission tracking with JSON-based storage

#### Validation Strategies
- **NUMERIC Validator**: Number comparison validation with operators (>, <, >=, <=, ==, !=)
- **EXIT_CODE Validator**: Command exit status validation for shell operations
- **KEYWORD Validator**: Text pattern matching with case-sensitive/insensitive options

#### MCP Tools
- `define_mission`: Create new automation missions with validation criteria
- `submit_attempt`: Submit execution results for validation
- `get_mission_status`: Query mission progress and attempt history
- `abort_mission`: Manually terminate running missions

#### Infrastructure
- TypeScript with strict mode enabled
- Comprehensive test suite (Jest) with 80% coverage requirement
- ESLint configuration for code quality
- State persistence with configurable retention policies
- Checkpoint mechanism for recovery (optional)

#### Documentation
- Complete README with architecture diagrams
- Quick start guide
- Best practices documentation
- Usage examples for all validation strategies
- API reference for all MCP tools

### Features

- ✅ Zero external dependencies for validation
- 🔒 Privacy-focused: all processing happens locally
- ⚡ Fast: no network latency
- 🎯 Domain-agnostic: works across multiple use cases
- 📊 Self-validating with automated success/failure detection
- 🔄 Iterative execution with automatic retry

### Configuration

- Configurable maximum attempts (default: 10)
- State retention policies (completed: 30 days, failed: 90 days)
- Optional checkpoint mechanism (every 5 attempts)
- Environment variable support for customization

### Use Cases

- Software Development: Fix lint errors, achieve test coverage targets
- Performance: Optimize response times, improve benchmark scores
- DevOps: Verify deployments, check service health
- Data Science: Improve model metrics, validate data quality
- Documentation: Ensure completeness, check for TODOs

### Requirements

- Node.js >= 18.0.0
- npm or yarn
- Claude Code CLI

### License

- MIT License

---

## [Unreleased]

### Planned

- Additional validation strategies (REGEX, RANGE)
- Web UI for mission monitoring
- Export mission history to CSV/JSON
- Custom validator plugins API
- Parallel mission execution
- Mission templates library

---

**Note**: This is the initial release of Mission Control MCP Server.

For upgrade instructions and breaking changes in future versions, see the README.md file.
