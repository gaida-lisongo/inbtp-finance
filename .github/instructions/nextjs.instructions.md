# Next.js App Router rules

Apply these rules when editing files in `src/app` or changing framework behavior.

## Routing and layouts
- Follow the existing App Router structure and route groups
- Keep `page.tsx` files centered on page assembly
- Put shared chrome and wrappers in `layout.tsx` files when appropriate

## Server and client boundaries
- Prefer Server Components by default
- Add `"use client"` only for interactivity, browser APIs, refs, context consumers, or hooks that require the client
- Do not convert a server file to client without a concrete reason

## Data and rendering
- Keep data shaping close to the route or server boundary
- Pass only the data needed by child components
- Prefer straightforward async server patterns over custom abstractions unless the repo already has them

## Navigation and metadata
- Use Next.js navigation primitives and existing conventions
- Preserve route-level behavior such as not-found handling and shared layouts

## File placement
- Route-specific UI may live near the route when it is truly local
- Shared UI belongs in `src/components`
- Shared helpers belong in existing utility or hook locations instead of inside route files
