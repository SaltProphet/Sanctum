# Sanctum

A modern, dark mode, mobile-first web application built with Next.js, TypeScript, and Tailwind CSS.

## Features

- 🌙 **Dark Mode**: Black backgrounds with slate-800 containers
- 💚 **Neon Green Accents**: Custom neon green color (#39FF14) for highlights
- 📱 **Mobile-First**: Optimized for mobile portrait mode (375x667)
- 🎨 **Tailwind-First Styling**: Tailwind utilities are used broadly, with some custom/global styles where needed
- ⚡ **Selective Client Components**: 'use client' only where necessary

## Design Principles

### 1. Use 'use client' Only When Necessary
- Server components by default for better performance
- Only use 'use client' for interactive components that need state, effects, or browser APIs
- Example: `InteractiveCounter.tsx` uses 'use client' for useState hook

### 2. Dark Mode Styling
- **Background**: `bg-black` for main background
- **Containers**: `bg-slate-800` with `border-slate-700` borders
- **Text**: `text-white`, `text-slate-300`, `text-slate-400` for hierarchy
- **Accents**: `text-neon-green` (#39FF14) for headings and highlights

### 3. Mobile-First Optimization
- Viewport settings for mobile devices
- Max-width containers (`max-w-md`) for portrait mode
- Proper spacing with `px-4 py-8`
- Touch-friendly button sizes

### 4. Tailwind-First Styling
- `app/globals.css` includes Tailwind directives plus additional global rules (for `:root`, `.dark`, and `body`)
- Most UI styling uses Tailwind utility classes
- `app/dashboard/page.tsx` currently uses inline styles for its dashboard UI
- Custom colors are defined in `tailwind.config.ts`

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
```

### Vercel Deployment Guardrail

This repo uses `vercel.json` + `scripts/vercel-ignore.sh` to reduce deployment usage:

- Production deployments continue only when the branch is `main`
- Preview/non-production deployments are skipped by default

If you need a preview deploy temporarily, update `scripts/vercel-ignore.sh` with your desired branch policy.

### Start Production Server

```bash
npm start
```

## Project Structure

```
sanctum/
├── app/
│   ├── layout.tsx        # Root layout with dark mode styling
│   ├── page.tsx          # Home page (server component)
│   └── globals.css       # Tailwind directives + additional global rules
├── components/
│   └── InteractiveCounter.tsx  # Example client component
├── tailwind.config.ts    # Tailwind config with custom colors
├── tsconfig.json         # TypeScript configuration
└── package.json          # Dependencies and scripts
```

## Color Palette

- **Background**: `#000000` (black)
- **Container**: `#1e293b` (slate-800)
- **Border**: `#334155` (slate-700)
- **Text Primary**: `#ffffff` (white)
- **Text Secondary**: `#cbd5e1` (slate-300)
- **Text Muted**: `#94a3b8` (slate-400)
- **Accent**: `#39FF14` (neon-green)

## Technologies

- **Framework**: Next.js 14.2.32 (App Router)
- **Language**: TypeScript 5.7.2
- **Styling**: Tailwind CSS 3.4
- **Runtime**: React 18.3.1

## Follow-up (if moving to Tailwind-only)

- Refactor `app/dashboard/page.tsx` to replace inline style objects with Tailwind utility classes.
- After the refactor, update this README to remove inline-style caveats and document a true Tailwind-only approach.

## AI Agent Workflow

- Repository Copilot rules: `.github/copilot-instructions.md`
- Role/mode switching guidance: `docs/GITHUB_AI_WORKFLOW.md`

## License

MIT
