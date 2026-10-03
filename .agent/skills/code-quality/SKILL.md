# ESLint & Prettier Adherence

## Purpose

Ensure all code changes strictly follow the project's existing ESLint and Prettier configuration.

ESLint and Prettier are the source of truth for code quality and formatting.

The AI must not create alternative formatting or linting conventions.

---

## 1. Inspect Configuration Before Making Changes

Before modifying code, inspect the project's existing configuration.

Look for:

- `eslint.config.js`
- `eslint.config.mjs`
- `.eslintrc`
- `.eslintrc.js`
- `.eslintrc.json`
- `prettier.config.js`
- `prettier.config.cjs`
- `.prettierrc`
- `.prettierrc.json`
- `.prettierrc.js`
- `package.json`

If the project already has ESLint and Prettier configuration:

**Follow the existing configuration. Do not replace, duplicate, or override it.**

Do not introduce another ESLint or Prettier configuration unless explicitly requested.

---

# 2. ESLint Is Mandatory

Every code change must comply with the project's ESLint configuration.

After modifying code:

1. Run ESLint on the changed files.
2. Fix all ESLint errors.
3. Fix warnings when they are caused by the new code.
4. Re-run ESLint after making fixes.
5. Do not consider the change complete while new ESLint errors remain.

Use the project's existing lint command from `package.json` when available.

For example:

```bash
npm run lint
```

or:

```bash
yarn lint
```

or:

```bash
pnpm lint
```

Do not assume the command. Inspect `package.json`.

---

# 3. Never Bypass ESLint

Do not bypass ESLint simply to make a change pass.

Do not unnecessarily add:

```tsx
// eslint-disable
```

```tsx
// eslint-disable-next-line
```

Do not disable ESLint rules globally.

Do not modify ESLint configuration merely to allow newly written code.

Do not exclude files from linting to avoid errors.

If an ESLint rule legitimately needs to be disabled:

1. Confirm that the rule genuinely conflicts with the required implementation.
2. Keep the suppression as narrow as possible.
3. Add a short explanation when appropriate.
4. Prefer fixing the implementation instead of disabling the rule.

---

# 4. Follow TypeScript ESLint Rules

Follow all TypeScript ESLint rules configured by the project.

Do not introduce unnecessary:

```tsx
any;
```

Do not use:

```tsx
// @ts-ignore
```

to hide errors.

Do not weaken TypeScript configuration to make code compile.

Do not bypass type errors with unnecessary type assertions.

If a type is genuinely unknown, prefer proper typing and narrowing rather than using `any`.

---

# 5. React and React Native ESLint Rules

Follow all configured React and React Native ESLint rules.

Pay particular attention to:

- React Hooks rules
- Hook dependency rules
- Component rules
- React Native style rules
- Import rules
- Unused variable rules
- Async/promise rules
- TypeScript rules

Do not suppress hook dependency warnings without understanding the dependency behavior.

Do not introduce patterns that intentionally violate configured React or React Native rules.

---

# 6. Prettier Is Mandatory

All modified code must follow the project's Prettier configuration.

Do not manually choose formatting preferences that conflict with Prettier.

After making changes:

1. Run Prettier on the changed files or the project's formatting command.
2. Review the resulting changes.
3. Ensure the files pass the project's Prettier check.

Use the project's existing package scripts.

For example:

```bash
npm run format
```

or:

```bash
npm run format:check
```

Do not assume the command exists. Inspect `package.json`.

---

# 7. Never Manually Fight Prettier

Do not intentionally format code differently from Prettier.

Do not introduce:

- Different quote styles
- Different indentation
- Different trailing comma behavior
- Different line wrapping
- Different bracket formatting
- Different semicolon conventions

Let Prettier determine formatting.

If Prettier changes the formatting of modified code, accept the formatting unless there is a legitimate project-specific reason not to.

---

# 8. ESLint and Prettier Responsibilities

Respect the separation of responsibilities:

### ESLint

ESLint handles:

- Code quality
- Potential bugs
- TypeScript rules
- React rules
- React Native rules
- Hooks rules
- Imports
- Unused variables
- Complexity
- Code patterns

### Prettier

Prettier handles:

- Formatting
- Indentation
- Quotes
- Semicolons
- Line wrapping
- Trailing commas
- Brackets

Do not attempt to solve a formatting problem by changing ESLint rules.

Do not attempt to solve a code-quality problem with Prettier.

---

# 9. Use Existing Project Scripts

Before running commands, inspect `package.json`.

Prefer existing scripts such as:

```bash
npm run lint
npm run lint:fix
npm run format
npm run format:check
npm run typecheck
npm test
```

Use the project's actual package manager and scripts.

Do not introduce new scripts unless explicitly required.

---

# 10. Automatic Fixes

When ESLint or Prettier provides an automatic fix, use it where appropriate.

For example:

```bash
npm run lint:fix
```

or:

```bash
npx eslint <changed-files> --fix
```

and:

```bash
npx prettier <changed-files> --write
```

However, do not blindly apply automatic fixes across unrelated parts of the project.

Prefer limiting fixes to files touched by the current task.

---

# 11. Do Not Modify Unrelated Code

When running formatting or lint fixes:

- Avoid unnecessary changes to unrelated files.
- Avoid large formatting-only changes outside the current task.
- Review the git diff afterward.
- Revert unrelated changes when appropriate.

The final diff should primarily contain changes required for the requested task plus necessary formatting/lint fixes.

---

# 12. Final Validation

Before declaring the task complete, perform the following checks.

### Step 1 — ESLint

Run the project's lint command.

Confirm:

```text
0 errors
```

New warnings introduced by the change should also be resolved where practical.

### Step 2 — Prettier

Run the project's formatting check.

Confirm all changed files pass.

### Step 3 — TypeScript

If the project has a type-check command, run it.

For example:

```bash
npm run typecheck
```

Fix TypeScript errors introduced by the change.

### Step 4 — Tests

If the change introduces or modifies functionality, run the relevant unit tests.

Run the full test suite when appropriate.

### Step 5 — Review

Review the final diff for:

- ESLint suppressions
- `@ts-ignore`
- Unnecessary `any`
- Debugging code
- `console.log`
- Unused imports
- Unused variables
- Formatting inconsistencies
- Unrelated changes
- Disabled rules
- Configuration changes

---

# 13. Quality Gate

Do not declare a task complete if:

- ESLint has errors caused by the change.
- Prettier check fails for modified files.
- TypeScript has errors caused by the change.
- Relevant tests fail.
- ESLint was bypassed unnecessarily.
- Prettier was intentionally bypassed.
- Configuration was weakened to accommodate the implementation.

Fix the implementation instead.

---

# 14. Configuration Changes

Do not modify:

- `eslint.config.js`
- `.eslintrc*`
- `prettier.config.js`
- `.prettierrc*`
- `tsconfig.json`
- `package.json`

solely to make the current implementation pass linting or formatting.

Only modify configuration when the task explicitly requires a configuration change or when the existing configuration is demonstrably incorrect.

If configuration must be changed:

1. Explain why the change is necessary.
2. Keep the change minimal.
3. Ensure existing rules are not unnecessarily weakened.
4. Run the complete relevant validation after changing the configuration.

---

# 15. Final Definition of Done

Before completing any task:

- [ ] Existing ESLint configuration was followed.
- [ ] Existing Prettier configuration was followed.
- [ ] No unnecessary ESLint rules were disabled.
- [ ] No unnecessary `@ts-ignore` was added.
- [ ] No unnecessary `any` was introduced.
- [ ] Modified files pass ESLint.
- [ ] Modified files pass Prettier.
- [ ] TypeScript passes when applicable.
- [ ] Relevant unit tests pass.
- [ ] Full test suite was run when appropriate.
- [ ] No unrelated formatting changes remain.
- [ ] Final diff was reviewed.

**The AI must treat ESLint and Prettier configuration as project-level requirements, not optional recommendations.**
