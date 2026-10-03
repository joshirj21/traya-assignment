# Theme Usage

## Purpose

Ensure all UI changes use the existing application theme instead of hardcoded design values.

## Mandatory Rule

For every UI-related change, **always inspect and use the theme from `/src/theme`**.

The `/src/theme` directory is the single source of truth for:

- Colors
- Typography
- Font sizes
- Font weights
- Line heights
- Spacing
- Border radius
- Shadows
- Other design tokens

## Before Making UI Changes

Before creating or modifying any UI component:

1. Inspect `/src/theme`.
2. Understand the existing theme structure and available tokens.
3. Find the appropriate existing token.
4. Use the existing theme token in the component.
5. Follow the same theme access pattern already used in the project.

Do not assume the theme structure. Inspect the actual files in `/src/theme` first.

## Colors

Never hardcode colors when an equivalent theme value exists.

Avoid:

```tsx
color: '#FFFFFF';
backgroundColor: '#000000';
borderColor: '#E5E5E5';
color: 'white';
color: 'black';
```

Use the appropriate value from `/src/theme`.

Example:

```tsx
color: theme.colors.textPrimary;
backgroundColor: theme.colors.background;
borderColor: theme.colors.border;
```

Use the actual naming and structure defined by `/src/theme`.

## Typography

Always use typography definitions from `/src/theme`.

Do not unnecessarily hardcode:

```tsx
fontSize: 16;
fontWeight: '600';
lineHeight: 24;
fontFamily: 'SomeFont';
letterSpacing: 0.2;
```

If the theme already provides the required typography style, use it.

If the required typography does not exist, determine whether a new theme token should be added rather than placing the value directly in the component.

## Spacing

Always use spacing tokens from `/src/theme`.

Avoid arbitrary values when an existing theme spacing token is available:

```tsx
padding: 16;
marginTop: 12;
marginBottom: 24;
gap: 8;
```

Instead use the project's existing spacing system.

For example:

```tsx
padding: theme.spacing.md;
marginTop: theme.spacing.sm;
gap: theme.spacing.xs;
```

Use the actual spacing API defined in `/src/theme`.

## Other Design Tokens

Before hardcoding any design value, check `/src/theme` for an existing token.

This includes:

- Border radius
- Shadows
- Elevation
- Opacity
- Icon sizes
- Component dimensions
- Animation durations
- Z-index
- Breakpoints

## Do Not Create Duplicate Tokens

Before adding a new theme value:

1. Search `/src/theme`.
2. Confirm an equivalent token does not already exist.
3. Reuse an existing token if possible.
4. Only add a new token when genuinely required.
5. Add new reusable design values to `/src/theme`, not directly inside a component.

## Final Check

Before completing a UI task:

- Confirm colors come from `/src/theme`.
- Confirm typography comes from `/src/theme`.
- Confirm spacing comes from `/src/theme`.
- Check the changed files for unnecessary hardcoded design values.
- Follow the existing theme usage patterns in the project.

Do not consider the UI change complete if it bypasses the existing theme without a valid reason.
