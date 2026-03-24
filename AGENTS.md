# AGENTS.md

## Project overview
- Stack: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4
- Product shape: admin dashboard template with reusable UI blocks, charts, tables, auth pages, and profile screens
- Goal: keep the codebase easy to extend without rewriting the existing template structure

## Repository priorities
- Prefer consistency with the current codebase over introducing new patterns
- Reuse existing components, hooks, and UI primitives before creating new ones
- Make surgical changes that solve the requested task without unrelated refactors
- Optimize for maintainability of a dashboard codebase: predictable files, reusable sections, and low-friction extension

## Architecture map
- `src/app`: routes, layouts, page entry points, and route grouping
- `src/components`: reusable UI and feature components
- `src/layout`: shell components such as sidebar and header
- `src/context`: React context providers
- `src/hooks`: reusable hooks
- `src/icons`: shared icon exports and SVG wrappers
- `public`: static assets

## Naming and file conventions
- React components: PascalCase file names and exported component names
- Hooks: `useXxx.ts` naming in `src/hooks` unless they are tightly local
- Context files: `XxxContext.tsx`
- Route files must follow Next.js conventions: `page.tsx`, `layout.tsx`, `not-found.tsx`
- Avoid generic names like `utils.ts`, `helpers.ts`, or `data.ts` when a more specific name is possible
- Prefer colocating feature-specific helper code near the feature until it is clearly shared

## Implementation rules
- Keep business logic out of presentational components when possible
- Avoid `any`; prefer explicit types and existing shared shapes
- Follow the existing file naming and component organization patterns
- Prefer extending an existing component near the feature instead of creating a generic abstraction too early
- Do not add dependencies unless they are required for the requested outcome
- Prefer explicit props and data flow over implicit cross-component coupling
- If a component grows too large, extract subcomponents without changing public behavior

## Next.js rules
- Default to Server Components unless client-side state, effects, browser APIs, or event handlers are required
- Add `"use client"` only where needed
- Keep route files thin; move reusable UI into `src/components`
- Preserve App Router conventions already used in `src/app`

## UI and UX rules
- Preserve the existing TailAdmin visual language unless the task asks for redesign
- Keep responsive behavior intact
- Reuse existing cards, buttons, forms, modals, tables, and chart wrappers first
- Maintain basic accessibility: semantic elements, labels, keyboard access, and useful alt text
- Keep dashboard pages visually scannable: clear section grouping, balanced spacing, and stable layout blocks
- Preserve loading, empty, and error states when they already exist; add them when a new feature truly needs them

## Dashboard-specific guidance
- Prefer page composition from reusable cards/sections rather than large monolithic page files
- Keep tables, charts, and stat cards configurable by props instead of hard-coding page-specific assumptions when reuse is likely
- Favor shallow prop drilling over premature global state for page-local interactions
- Keep chart configuration close to the chart component unless it is reused across multiple pages

## Validation
- After code changes, run the existing checks that apply
- Primary repo commands:
  - `npm run lint`
  - `npm run build`
- If a command fails, report the real failure clearly instead of masking it

## Working style
- Summarize the intended approach briefly before making major edits
- Read enough surrounding code before editing to avoid pattern mismatches
- When touching shared UI, consider likely impact on dashboard pages that reuse it
- If adding a new pattern, align at least one nearby file with the same pattern so the repo stays internally coherent

## Safety rules
- Do not commit secrets or credentials
- Do not use destructive git commands unless explicitly requested
- Do not rewrite large unrelated sections to satisfy a small request
