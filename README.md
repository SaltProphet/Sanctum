# Sanctum

A modern, dark mode, mobile-first web application built with Next.js 15, TypeScript, and Tailwind CSS.

## Features

- 🌙 **Dark Mode**: Black backgrounds with slate-800 containers
- 💚 **Neon Green Accents**: Custom neon green color (#39FF14) for highlights
- 📱 **Mobile-First**: Optimized for mobile portrait mode (375x667)
- 🎨 **Pure Tailwind CSS**: No custom CSS files, only Tailwind utilities
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

### 4. Tailwind-Only Styling
- No custom CSS files (except `globals.css` with Tailwind directives)
- All styling done with Tailwind utility classes
- Custom colors defined in `tailwind.config.ts`

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
│   └── globals.css       # Tailwind directives only
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

- **Framework**: Next.js 15 (App Router)
  - Upgraded from Next.js 14.2.x to Next.js 15 for improved App Router performance, enhanced TypeScript support, and better developer experience
  - Uses `^15` version range to receive minor updates and patches automatically
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 3.4
- **Runtime**: React 18

## License

MIT