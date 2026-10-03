# Unit Testing

## Purpose

Ensure every new or modified functionality has appropriate unit test coverage and that existing tests continue to pass after changes.

## Mandatory Rule

Whenever new functionality or behavior is added or existing functionality is modified:

1. Add or update the relevant unit test cases.
2. Run the relevant tests.
3. Confirm the tests pass.
4. Run the complete test suite when appropriate to ensure the change has not introduced regressions.

Do not consider a functionality change complete without testing it.

## New Functionality

When adding a new:

- Function
- Utility
- Hook
- Component behavior
- Business logic
- Validation
- State transition
- API behavior
- Event handler
- Conditional behavior

write unit test cases covering the new behavior.

The tests must test the actual expected behavior, not simply increase code coverage.

## Modified Functionality

When modifying existing functionality:

1. Find the existing tests.
2. Update them if the expected behavior changed.
3. Add additional test cases for the new behavior or edge cases.
4. Run the relevant tests.

Do not remove existing tests unless they are genuinely obsolete because the intended behavior has changed.

## React Native Components

For React Native components, use the project's existing Jest and React Native Testing Library (RNTL) setup.

Test user-visible behavior and interactions where appropriate.

Examples include:

- Rendering
- Button presses
- Text input
- Callbacks
- Conditional rendering
- Loading states
- Error states
- Empty states
- Disabled states
- User interactions

Prefer RNTL queries such as:

```tsx
screen.getByText();
screen.getByRole();
screen.getByTestId();
```

and appropriate interaction utilities.

Avoid testing implementation details when behavior can be tested from the user's perspective.

## Functions and Utilities

For new functions or utilities, test:

- Normal inputs
- Expected output
- Important edge cases
- Invalid inputs where applicable
- Error handling where applicable

Example:

```tsx
describe('calculateTotal', () => {
  it('calculates the total correctly', () => {
    expect(calculateTotal(10, 20)).toBe(30);
  });

  it('handles zero values', () => {
    expect(calculateTotal(0, 20)).toBe(20);
  });
});
```

## Bug Fixes

When fixing a bug:

1. Add a regression test that reproduces the bug.
2. Verify the test fails with the old behavior when practical.
3. Fix the implementation.
4. Run the test again.
5. Confirm the regression test passes.

Keep the regression test after the bug is fixed.

## Test Execution

After making a change:

1. Run the tests related to the changed code.
2. If the project has a complete test command, run the full test suite before completing the task.

Use the project's existing package scripts.

For example:

```bash
npm test
```

or:

```bash
yarn test
```

or:

```bash
pnpm test
```

Do not assume which package manager or test command is used. Inspect `package.json` first.

## Full Test Suite

Run the complete test suite after changes when:

- The change affects shared code.
- The change affects common components.
- The change affects state management.
- The change affects utilities used by multiple areas.
- The change affects navigation.
- The change affects API/network behavior.
- The change is large or cross-cutting.
- The project convention expects the full suite to be run.

For small isolated changes, running the relevant tests first is acceptable, but run the full suite when practical.

## Never Weaken Tests

Do not:

- Delete tests to make them pass.
- Remove assertions just to fix failures.
- Change expected results without a corresponding behavior change.
- Mock the implementation in a way that prevents the actual behavior from being tested.
- Skip tests simply because the change is small.

If an existing test fails after a change, determine whether:

1. The implementation is incorrect, or
2. The expected behavior intentionally changed.

Fix the implementation or update the test accordingly.

## Final Validation

Before completing the task:

- Confirm tests were added or updated for new/changed functionality.
- Run the relevant unit tests.
- Run the full test suite when appropriate.
- Confirm all tests pass.
- Confirm no existing tests were unnecessarily removed or weakened.

Do not consider the task complete if relevant tests are failing.
