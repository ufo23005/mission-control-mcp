# Contributing to Mission Control MCP Server

First off, thank you for considering contributing to Mission Control MCP Server! It's people like you that make this project such a great tool.

## 🌟 Ways to Contribute

- 🐛 **Report bugs** - Help us identify and fix issues
- 💡 **Suggest features** - Share ideas for new capabilities
- 📖 **Improve documentation** - Help others understand the project
- 💻 **Submit code** - Contribute bug fixes or new features
- 🧪 **Write tests** - Improve code coverage and reliability

## 🚀 Development Setup

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Git

### Getting Started

1. **Fork the repository**

   Click the "Fork" button at the top right of the repository page.

2. **Clone your fork**

   ```bash
   git clone https://github.com/YOUR_USERNAME/mission-control-mcp.git
   cd mission-control-mcp
   ```

3. **Add upstream remote**

   ```bash
   git remote add upstream https://github.com/ufo23005/mission-control-mcp.git
   ```

4. **Install dependencies**

   ```bash
   npm install
   ```

5. **Build the project**

   ```bash
   npm run build
   ```

6. **Run tests**

   ```bash
   npm test
   ```

## 📝 Development Workflow

### 1. Create a Branch

Always create a new branch for your work:

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions or fixes

### 2. Make Your Changes

- Write clean, readable code
- Follow existing code style and patterns
- Add tests for new functionality
- Update documentation as needed
- Keep commits atomic and well-described

### 3. Code Style

This project uses:
- **TypeScript** - Strict mode enabled
- **ESLint** - For code linting
- **Prettier** (via EditorConfig) - For code formatting

Run linting:

```bash
npm run lint
```

### 4. Testing

- Write tests for all new features and bug fixes
- Ensure all tests pass before submitting
- Maintain test coverage >= 80%

Run tests:

```bash
npm test

# With coverage report
npm test -- --coverage
```

### 5. Commit Messages

Follow conventional commit format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Test additions or changes
- `chore`: Build process or auxiliary tool changes

Example:

```
feat(validators): add support for regex pattern validation

Implement new RegexValidator class that supports pattern matching
validation strategy for text-based validation scenarios.

Closes #123
```

### 6. Keep Your Fork Updated

```bash
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```

## 🔍 Pull Request Process

### Before Submitting

- [ ] Run all tests and ensure they pass
- [ ] Run linting and fix any issues
- [ ] Update documentation if needed
- [ ] Add/update tests for your changes
- [ ] Update CHANGELOG.md with your changes
- [ ] Ensure your code builds successfully

### Submitting Your PR

1. **Push your branch**

   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create a Pull Request**

   - Go to the repository on GitHub
   - Click "New Pull Request"
   - Select your fork and branch
   - Fill out the PR template completely
   - Link any related issues

3. **PR Title Format**

   Use conventional commit format in your PR title:

   ```
   feat: add regex pattern validation support
   ```

4. **Description**

   Provide a clear description of:
   - What changes you made
   - Why you made them
   - How to test the changes
   - Any breaking changes

### Review Process

- Maintainers will review your PR
- You may be asked to make changes
- Once approved, a maintainer will merge your PR
- Your contribution will be included in the next release

## 📚 Code Organization

```
src/
├── core/          # Core mission control logic
├── validators/    # Validation strategy implementations
├── state/         # State management
├── tools/         # MCP tool implementations
├── types/         # TypeScript type definitions
└── utils/         # Utility functions
```

### Adding a New Validator

1. Create new validator class in `src/validators/`
2. Extend `BaseValidator`
3. Implement `validate()` method
4. Add tests in `src/validators/__tests__/`
5. Update type definitions in `src/types/validation.ts`
6. Document in README.md

### Adding a New MCP Tool

1. Create new tool in `src/tools/`
2. Follow existing tool patterns
3. Add to tool registration in `src/index.ts`
4. Add tests in `tests/integration/`
5. Document in README.md

## 🧪 Testing Guidelines

### Unit Tests

- Located in `src/**/__tests__/`
- Test individual components in isolation
- Mock external dependencies
- Use descriptive test names

### Integration Tests

- Located in `tests/integration/`
- Test complete workflows
- Test MCP tool interactions
- Test state persistence

### Test Coverage Requirements

- Minimum 80% overall coverage
- 70% branch coverage
- All new code should be tested

## 📖 Documentation

### Code Documentation

- Use JSDoc comments for public APIs
- Explain complex logic with inline comments
- Keep comments up-to-date with code changes

### README Updates

Update README.md when:
- Adding new features
- Changing configuration options
- Modifying installation steps
- Adding new examples

## 🐛 Reporting Bugs

### Before Reporting

- Check existing issues to avoid duplicates
- Verify the bug exists in the latest version
- Collect relevant information

### Bug Report Should Include

- Clear, descriptive title
- Steps to reproduce
- Expected vs actual behavior
- Mission Control version
- Node.js version
- Operating system
- Relevant logs or error messages
- Minimal reproduction example if possible

## 💡 Suggesting Features

### Feature Request Should Include

- Clear, descriptive title
- Detailed description of the feature
- Use cases and benefits
- Potential implementation approach (optional)
- Examples of how it would be used

## ❓ Questions?

- Open a GitHub issue with the `question` label
- Check existing documentation and issues first
- Be clear and specific about what you need help with

## 📜 Code of Conduct

### Our Standards

- Be respectful and inclusive
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy towards others

### Unacceptable Behavior

- Harassment or discriminatory language
- Trolling or insulting comments
- Public or private harassment
- Publishing others' private information

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Mission Control MCP Server! 🎉
