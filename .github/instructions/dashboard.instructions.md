# Dashboard UI rules

Apply these rules when editing dashboard pages, cards, charts, tables, lists, widgets, or profile/admin screens.

## Page composition
- Build pages from smaller sections instead of one large component
- Keep top-level pages easy to scan: breadcrumb/header first, summary content next, then detailed blocks
- Reuse existing wrappers such as cards and section containers before introducing new shells

## Cards and widgets
- Prefer one clear responsibility per card
- Keep card APIs simple: title, subtitle, actions, content, and optional footer patterns
- Avoid embedding unrelated logic into generic dashboard cards

## Tables and lists
- Preserve readable column spacing and responsive overflow behavior
- Keep data formatting close to the table when it is presentation-specific
- If adding row actions, make them consistent with existing button/dropdown patterns

## Charts and analytics
- Keep chart options readable and grouped by concern
- Preserve axis, legend, tooltip, and color consistency with nearby charts
- If a chart is primarily visual, keep data transformation outside of JSX

## Forms, modals, and settings panels
- Reuse existing input, label, select, checkbox, modal, and button components
- Keep destructive or high-impact actions visually distinct
- Keep submit/cancel flows obvious and predictable

## Responsive behavior
- Check how widgets stack across breakpoints before introducing new grid structures
- Prefer existing grid and spacing patterns over one-off layout utilities
