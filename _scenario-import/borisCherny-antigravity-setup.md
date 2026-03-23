# Project overview

Bun + TypeScript demo project showcasing Boris Cherny's Claude Code workflow setup.

- **Runtime**: Bun (not Node.js)
- **Language**: TypeScript (strict mode)
- **Linter**: ESLint with @typescript-eslint
- **Test**: bun:test

## Project structure

```
.
├── index.test.ts          # Source + tests (bun:test)
├── package.json           # Scripts: typecheck, test, lint
├── tsconfig.json          # Strict TS, bundler mode, ESNext
├── .claude/
│   ├── settings.json      # Pre-allowed safe commands
│   └── commands/
│       └── commit-push-pr # Slash command for commit workflow
└── .agents/
    └── workflows/         # Subagent definitions
```

## Development workflow

**Always use `bun`, not `npm`.**

```sh
# 1. Make changes

# 2. Typecheck (fast)
bun run typecheck

# 3. Run tests (slow)
bun run test -- -t "test name"             # Single suite
bun run test:file -- "glob"                # Specific files

# 4. Lint before committing
bun run lint:file -- "file.ts"             # Specific files
bun run lint                               # All files

# 5. Before creating PR
bun run lint:antigravity && bun run test
```

## Coding conventions

- Use `import`/`export` (ES modules). Never use `require()`.
- Prefer `const` over `let`. Never use `var`.
- Use TypeScript strict types. Avoid `any`.
- Export functions directly from the file they're defined in.
- Tests live alongside source code (e.g., `index.test.ts`).

## Verification

After every change, Claude must verify its work:
1. `bun run typecheck` — must pass with zero errors
2. `bun run test` — all tests must pass
3. `bun run lint` — no lint errors before committing
