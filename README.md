# Mission Control MCP Server

[![npm version](https://img.shields.io/npm/v/mission-control-mcp.svg)](https://www.npmjs.com/package/mission-control-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/mission-control-mcp.svg)](https://nodejs.org)

> **Mission Control MCP | Mission Control Automation Orchestrator**
>
> A domain-agnostic task automation and validation system for Claude Code, enabling autonomous task execution with self-verification capabilities.

## 📋 Overview

Mission Control is a Model Context Protocol (MCP) server designed specifically for Claude Code. It provides a framework for automating tasks with built-in validation loops, allowing Claude to:

- Execute tasks autonomously
- Verify results against objective criteria
- Iterate until success or maximum attempts
- Provide detailed feedback for each attempt

### Key Features

- **✅ Zero External Dependencies**: All validation runs locally
- **🔒 Privacy-Focused**: No data leaves your machine
- **⚡ Fast**: No network latency for validations
- **🎯 Domain-Agnostic**: Works across software development, DevOps, data science, and more
- **📊 Self-Validating**: Automated success/failure detection
- **🔄 Iterative**: Automatic retry with feedback

## 🏗️ Architecture

### Core Components

1. **Mission Definer**: Locks in task parameters and validation criteria
2. **Attempt Counter**: Prevents infinite loops with configurable limits
3. **Dynamic Feedback Engine**: Generates actionable improvement suggestions
4. **Validation Strategies**: NUMERIC, EXIT_CODE, and KEYWORD validators
5. **State Manager**: Tracks mission progress and history

### Workflow

```
┌─────────────────────────────────────────┐
│ 1. Define Mission                       │
│    - Goal description                   │
│    - Validation strategy                │
│    - Success criteria                   │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 2. Execution Loop                       │
│    ┌─────────────────────────────────┐  │
│    │ Claude executes task            │  │
│    └─────────────────────────────────┘  │
│              ↓                          │
│    ┌─────────────────────────────────┐  │
│    │ Submit attempt for validation   │  │
│    └─────────────────────────────────┘  │
│              ↓                          │
│    ┌─────────────────────────────────┐  │
│    │ System validates result         │  │
│    └─────────────────────────────────┘  │
│              ↓                          │
│        Pass? ─No→ Retry with feedback   │
│          │                              │
│         Yes                             │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 3. Mission Complete                     │
│    - Success report                     │
│    - Attempt history                    │
└─────────────────────────────────────────┘
```

## 📦 Installation

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Claude Code CLI

### Option 1: NPM Installation (Recommended)

Install globally via npm:

```bash
npm install -g mission-control-mcp
```

Then add to Claude Code:

```bash
claude mcp add mission-control mission-control-mcp
```

Or configure manually:

**Configuration file location:**
- **macOS/Linux**: `~/.config/claude-code/mcp.json`
- **Windows**: `%USERPROFILE%\.claude-code\mcp.json`

```json
{
  "mcpServers": {
    "mission-control": {
      "command": "mission-control-mcp",
      "env": {
        "MCP_ENABLE_PERSISTENCE": "true"
      }
    }
  }
}
```

### Option 2: Using npx (No Installation)

```bash
claude mcp add mission-control --transport stdio -- npx -y mission-control-mcp
```

### Option 3: From Source (Development)

```bash
# Clone the repository
git clone https://github.com/ufo23005/mission-control-mcp.git
cd mission-control-mcp

# Install dependencies
npm install

# Build the project
npm run build
```

Configure Claude Code:

**Configuration file location:**
- **macOS/Linux**: `~/.config/claude-code/mcp.json`
- **Windows**: `%USERPROFILE%\.claude-code\mcp.json`

```json
{
  "mcpServers": {
    "mission-control": {
      "command": "node",
      "args": ["<path-to-installation>/mission-control-mcp/dist/index.js"],
      "env": {
        "MCP_STATE_DIR": "<path-to-installation>/mission-control-mcp/.state",
        "MCP_ENABLE_PERSISTENCE": "true"
      }
    }
  }
}
```

### Verify Installation

```bash
claude mcp list
# Should show mission-control in the list with ✓ Connected status
```

## 🚀 Usage

### Validation Strategies

#### 1. NUMERIC - Number Comparison

For tasks with measurable numeric goals (performance metrics, coverage, scores).

**Example: Test Coverage**

```typescript
// Define mission
{
  "goal": "Increase test coverage to 80%",
  "strategy": "NUMERIC",
  "criteria": {
    "operator": ">=",
    "threshold": 80.0,
    "metricName": "coverage_percentage"
  },
  "maxAttempts": 10
}

// Submit attempt
{
  "missionId": "<mission-id>",
  "output": "Coverage: 82.5%",
  "value": 82.5
}
```

**Operators**: `>`, `<`, `>=`, `<=`, `==`, `!=`

#### 2. EXIT_CODE - Command Status

For tasks validated by command execution success.

**Example: Linting**

```typescript
// Define mission
{
  "goal": "Fix all ESLint errors",
  "strategy": "EXIT_CODE",
  "criteria": {
    "expectedCode": 0,
    "command": "npm run lint"
  },
  "maxAttempts": 8
}

// Submit attempt
{
  "missionId": "<mission-id>",
  "output": "Linting complete",
  "value": 0  // exit code
}
```

#### 3. KEYWORD - Text Matching

For tasks validated by output content.

**Example: Build Success**

```typescript
// Define mission
{
  "goal": "Successful production build",
  "strategy": "KEYWORD",
  "criteria": {
    "keyword": "Build completed successfully",
    "mustContain": true,
    "caseSensitive": false
  }
}

// Submit attempt
{
  "missionId": "<mission-id>",
  "output": "Build completed successfully. Output: dist/"
}
```

## 🛠️ MCP Tools

### define_mission

Define a new automation task with validation criteria.

**Parameters:**

- `goal` (string): Natural language task description
- `strategy` (enum): `NUMERIC` | `EXIT_CODE` | `KEYWORD`
- `criteria` (object): Strategy-specific validation parameters
- `maxAttempts` (number, optional): Maximum retry limit (default: 10)
- `enableCheckpoints` (boolean, optional): Enable recovery checkpoints
- `checkpointFrequency` (number, optional): Checkpoint every N attempts

**Returns:** Mission ID and configuration

### submit_attempt

Submit a task execution result for validation.

**Parameters:**

- `missionId` (string): Mission identifier
- `output` (string): Command/process output
- `value` (number|string, optional): Extracted validation value

**Returns:** Validation result with feedback and next steps

### get_mission_status

Query current mission progress and history.

**Parameters:**

- `missionId` (string): Mission identifier

**Returns:** Status, attempt count, and history

### abort_mission

Manually stop a running mission.

**Parameters:**

- `missionId` (string): Mission identifier
- `reason` (string, optional): Abort reason

**Returns:** Confirmation and final status

## 📖 Examples

### Example 1: Fix ESLint Errors

```bash
$ claude "Fix all ESLint errors. Use define_mission with EXIT_CODE strategy, then iterate until npm run lint returns 0."
```

Claude will:

1. Call `define_mission` with EXIT_CODE criteria (expectedCode: 0)
2. Analyze code and fix errors
3. Run `npm run lint`
4. Call `submit_attempt` with exit code
5. Repeat until successful or max attempts

### Example 2: Optimize Performance

```bash
$ claude "Reduce API response time below 100ms. Validate with local benchmark tests."
```

Claude will:

1. Define mission with NUMERIC strategy (< 100)
2. Make optimizations
3. Run benchmark tests
4. Submit results
5. Iterate based on feedback

### Example 3: Documentation Compliance

```bash
$ claude "Ensure all public functions have JSDoc comments. Check with custom validator."
```

Claude will:

1. Define mission with KEYWORD or custom validation
2. Add missing documentation
3. Run documentation checker
4. Verify completeness

## 🔧 Configuration

### State Management

The orchestrator maintains state in `.state/` directory:

```
.state/
├── missions/       # Active and completed missions
└── checkpoints/    # Recovery checkpoints
```

### Retention Policies

- **Completed missions**: 30 days (configurable)
- **Failed missions**: 90 days (for analysis)
- **Active missions**: Retained until completion

### Resource Limits

Default limits (configurable in code):

- Max attempts: 10
- Checkpoint frequency: Every 5 attempts
- Attempt timeout: None (per-mission configurable)

## 📁 Project Structure

```
src/
├── index.ts              # MCP server entry point
├── types/                # TypeScript type definitions
│   ├── mission.ts        # Mission and attempt types
│   ├── validation.ts     # Validation strategy types
│   └── state.ts          # State management types
├── core/                 # Core components
│   ├── MissionDefiner.ts # Mission configuration
│   ├── AttemptCounter.ts # Retry management
│   └── FeedbackEngine.ts # Feedback generation
├── validators/           # Validation strategies
│   ├── BaseValidator.ts
│   ├── NumericValidator.ts
│   ├── ExitCodeValidator.ts
│   └── KeywordValidator.ts
├── state/                # State management
│   └── StateManager.ts   # Mission state tracking
├── tools/                # MCP tool implementations
│   ├── defineMission.ts
│   ├── submitAttempt.ts
│   ├── getMissionStatus.ts
│   └── abortMission.ts
└── utils/                # Utilities
    ├── logger.ts         # Logging system
    └── errors.ts         # Error types
```

## 🎯 Use Cases

| Domain            | Task                 | Strategy  | Success Criteria           |
| ----------------- | -------------------- | --------- | -------------------------- |
| **Software Dev**  | Fix lint errors      | EXIT_CODE | `exit_code == 0`           |
| **Testing**       | Achieve 80% coverage | NUMERIC   | `coverage >= 80`           |
| **Performance**   | Optimize load time   | NUMERIC   | `load_time < 2.0`          |
| **DevOps**        | Verify deployment    | KEYWORD   | Output contains "deployed" |
| **Data Science**  | Improve model F1     | NUMERIC   | `f1_score >= 0.85`         |
| **Documentation** | Complete API docs    | KEYWORD   | No "TODO" found            |

## 🔒 Privacy & Security

- **No external APIs**: All validation runs locally
- **No data transmission**: Everything stays on your machine
- **No network required**: Works completely offline
- **Audit logging**: Complete attempt history
- **Configurable limits**: Prevent resource exhaustion

## 🚧 Limitations

### Suitable For:

- Objectively measurable outcomes
- Repeatable operations
- Automatable verification
- Local command-line tools

### Not Suitable For:

- Subjective quality judgments
- One-time irreversible operations
- Tasks requiring human creativity
- Real-time interactive processes

## 🤝 Contributing

Contributions welcome! Please ensure:

- All TypeScript types are defined
- Code follows existing patterns
- Tests pass (when implemented)
- Documentation updated

## 📄 License

MIT

## 📚 References

- [Model Context Protocol](https://modelcontextprotocol.io/) - MCP specification
- [Claude Code MCP](https://code.claude.com/docs/en/mcp) - Claude Code MCP documentation