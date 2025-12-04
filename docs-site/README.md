## Nael Framework Documentation Site

This package hosts the public documentation for the Nael Framework framework. It is a Next.js App Router
project styled with Tailwind CSS, [shadcn/ui](https://ui.shadcn.com/), and
[Kibo UI](https://www.kibo-ui.com/) components for the hero banner + theme switcher.

### Scripts

All commands should be executed from `examples/docs-site`:

```bash
bun dev        # start the docs site locally
bun run build  # create a production build
bun start      # serve the production build
bun lint       # run eslint
```

The workspace already inherits Bun from the monorepo root, so `bun dev` is the canonical way to
preview changes (port 3000 by default).

### Tech stack highlights

- **Next.js 16 App Router** with React Server Components.
- **Tailwind CSS 3.4** with shadcn tokens and `tailwindcss-animate`.
- **shadcn/ui primitives** (`Button`, `Card`, `Tabs`, etc.) for structured layouts.
- **Kibo UI components** (`Banner`, `ThemeSwitcher`) layered on top of the shadcn design tokens.
- **next-themes** for persisted color schemes controlled by the Kibo UI switcher.

### Content structure

- `app/page.tsx` – marketing-style landing page with hero + feature highlights.
- `app/getting-started/page.tsx` – step-by-step CLI onboarding and multi-tenant recipe.
- `app/installation/page.tsx` – package installation instructions, async modules, and linking tips.
- `src/components/sections/*` – composable content blocks.
- `src/components/kibo-ui/*` – generated Kibo UI components used across the site.

### Deployment

Builds can be deployed on any Node-compatible host (Vercel, Netlify, custom infra):

```bash
bun run build
bun start
```

The output respects the monorepo structure, so CI/CD pipelines can run from the repository root and
scope commands with `--cwd examples/docs-site`.
