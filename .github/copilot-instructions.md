# Copilot instructions for this repository

When working in this repository:

- Treat `AGENTS.md` as the global source of project rules
- Prefer small, reviewable edits over large rewrites
- Search for an existing component, hook, or pattern before creating a new one
- Follow the current TailAdmin-style structure instead of introducing a new design system
- Keep route files in `src/app` focused on composition; move reusable UI into `src/components`
- Use strict TypeScript-friendly solutions and avoid `any`
- Preserve current responsive behavior and theme support
- When editing client components, keep browser-only logic isolated and minimal
- Prefer matching nearby implementation patterns over applying generic framework advice
- For dashboard work, look for existing cards, chart wrappers, tables, forms, modals, and layout sections before adding new primitives
- When creating new files, choose names that describe the feature or component purpose directly
- Validate with the existing project commands when the task changes runtime behavior or types:
  - `npm run lint`
  - `npm run build`

Useful operator habits:

- Mention important files with `@...` when prompting
- Mention existing reference components with `@...` before requesting a new feature so the agent can mirror the local pattern
- Use `/diff` to review local changes
- Use `/review` before finalizing a larger change
- Use `/model` if you want to switch models for a task
- Use `/instructions` to verify which repository rules are active
