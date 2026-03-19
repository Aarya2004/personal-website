# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `bun install` - Install dependencies
- `bun dev` - Start dev server at localhost:4321
- `bun run build` - Build production site to `./dist/`
- `bun preview` - Preview production build locally

## Architecture

Personal website built with **Astro 4** + **Tailwind CSS** + **@tailwindcss/typography**, using **bun** as the package manager. Features dark/light mode toggle, view transitions, and scroll animations.

**Pages** (`src/pages/`): File-based routing. Home (`index.astro`), Projects (`projects.astro`), Blog listing (`blog.astro`), dynamic blog posts (`blog/[...slug].astro`).

**Content** (`src/content/`): Blog posts as Markdown in `src/content/blog/` with Zod schema in `config.ts`. Queried via `getCollection('blog')`.

**Data** (`src/data/`): `projects.ts` exports a typed array of projects.

**Layouts** (`src/layouts/`): `Layout.astro` is the base shell (title, description, activeNav props, ViewTransitions, theme script, scroll animations). `BlogPost.astro` wraps Layout for blog post pages with prose styling.

**Components** (`src/components/`): `Header` (sticky nav with mobile menu, ThemeToggle), `Footer` (copyright + social icons), `Social` (SVG icon links), `ThemeToggle` (dark/light with localStorage persistence), `ProjectCard`, `BlogPostCard`.

**Styling**: Tailwind CSS with `darkMode: 'class'`. Typography plugin for prose. No separate CSS files.
