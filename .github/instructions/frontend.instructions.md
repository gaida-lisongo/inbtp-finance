# Frontend implementation rules

Apply these rules when editing UI, components, hooks, styling, or client-side behavior.

## Component design
- Prefer composing existing primitives from `src/components/ui` and `src/components/common`
- Keep components focused on one responsibility
- Extract repeated JSX only after confirming it is reused or clearly reusable
- Prefer passing typed props over implicit object bags

## Styling
- Reuse existing Tailwind utility patterns already present in nearby files
- Avoid introducing a different spacing, color, or radius system unless requested
- Preserve dark mode compatibility where surrounding components already support it

## Forms and interactions
- Reuse existing form inputs, labels, modal patterns, dropdowns, and switches where possible
- Keep validation and form state explicit
- Do not hide errors silently

## Accessibility
- Use semantic HTML first
- Ensure interactive elements remain keyboard accessible
- Add labels, button text, and alt text that are meaningful in context

## Performance
- Avoid unnecessary client components
- Avoid re-renders caused by unstable inline objects or handlers when it meaningfully affects shared UI
