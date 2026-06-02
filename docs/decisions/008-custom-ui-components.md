# ADR-008: Custom minimal UI components over full shadcn/ui install

**Date:** 2026-06-02
**Status:** Accepted

## Context

The project needs a consistent design system. The main options were:

1. **Full shadcn/ui CLI install** — runs `npx shadcn init` and `npx shadcn add <component>` to copy component source into the project
2. **Headless UI library directly** (Radix UI primitives + manual styling)
3. **Pre-built component library** (Ant Design, MUI, Chakra) — opinionated styling, heavier bundle
4. **Custom minimal components** — write only what is needed, using Radix primitives and Tailwind

## Decision

Use **custom minimal components** in `src/components/ui/`, built directly on top of Radix UI primitives and Tailwind CSS, following the same patterns as shadcn/ui but without the full CLI installation.

The component set built: `Button`, `Card`, `Input`, `Label`, `Badge`.

## Rationale

- **shadcn/ui CLI** was attempted but encountered npm peer dependency conflicts with the `@typescript-eslint` versions used in this project. Rather than force-resolving dependencies, components were authored directly.
- The application's UI needs are well-defined and small: forms, tables, cards, badges. A full shadcn install would copy ~40 components of which fewer than 10 would be used.
- `class-variance-authority` (CVA) is used for variant management, matching the shadcn/ui pattern. Any shadcn component can be copied in manually using the same approach when needed.
- Radix UI primitives are already installed for accessibility (dialog, dropdown, label, select, tabs). No additional libraries are needed.

## Consequences

- New UI needs require writing or copying components manually rather than running `npx shadcn add`. This is the intended workflow for this codebase.
- The component API surface is intentionally minimal. Components do not forward all HTML attributes or implement all accessibility patterns. Expand them as specific needs arise rather than pre-emptively.
- The `cn()` utility (`src/lib/utils.ts`, via `clsx` + `tailwind-merge`) is the standard way to conditionally merge class names throughout the codebase.
