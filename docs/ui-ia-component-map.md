# Sanctum UI Redesign: Information Architecture + Screen-by-Screen Component Map

## 1) Goals and constraints

### Product goals
- Move to a **UI-first architecture** where layout, navigation, and reusable components are stable before deeper feature styling.
- Support both:
  - a **content/feed experience** (browse/watch)
  - a **room/video experience** (interactive call/session)
- Keep Daily video integration isolated so Daily-specific logic does not leak into all screens.

### Technical constraints from current codebase
- Next.js App Router with route groups already centered around:
  - `/` (landing)
  - `/dashboard`
  - `/room/[roomId]`
  - `/blocked`
  - `/terms`
  - `/creator/deposit/initiate` (API route)
  - `/creator/veriff/session` (API route)
- Daily integration is currently local to the room flow and should remain feature-local.

---

## 2) Proposed top-level information architecture (IA)

Use a shell-first IA with clear mode boundaries:

1. **Public area**
   - Landing (`/`)
   - Terms (`/terms`)
2. **Authenticated app area**
   - Dashboard/Feed (`/dashboard`)
   - Room (`/room/[roomId]`)
   - Blocked (`/blocked`) for gated users
   - Creator onboarding API routes:
     - `/creator/deposit/initiate` (POST)
     - `/creator/veriff/session` (POST)
3. **Shared system surfaces**
   - Notifications/toasts
   - Command/search palette (optional)
   - Global modal layer

### Core IA principle
The app should have one stable **App Shell** with a small number of consistent regions:
- **Top bar**: brand + global actions + user/account affordance
- **Main content region**: screen-specific content
- **Context rail/drawer** (optional per screen): metadata, participants, actions
- **Overlay layer**: temporary interactions only

---

## 3) Layout model (z-index and layering)

Use a deterministic layer stack to avoid ad hoc overlay behavior:

1. **Layer 0 – Base**: page background/grid
2. **Layer 1 – App shell regions**: header/main/side panels
3. **Layer 2 – Feature content**: feed cards, room tiles, forms
4. **Layer 3 – Media UI**: Daily video stage and pinned media elements
5. **Layer 4 – Feature overlays**: video controls, quick actions, panel drawers
6. **Layer 5 – Global overlays**: modal dialogs, blocking confirmations, toasts

> Recommendation: keep Daily at Layer 3. Keep controls/tooling in Layer 4. Do not put full workflows in Layer 4 unless intentionally modal.

---

## 4) Component taxonomy

Build and document components in three bands.

### A. Primitives (design-system level)
- `Button` (variants: primary, secondary, ghost, danger)
- `IconButton`
- `Input`, `Textarea`, `Select`
- `Badge`, `Tag`
- `Avatar`
- `Tooltip`
- `Modal`
- `Drawer`
- `Toast`
- `Spinner/Skeleton`

### B. Composition components (layout + repeated patterns)
- `AppShell`
- `TopNav`
- `SideNav` / `BottomNav` (depending on breakpoint)
- `PageHeader`
- `Card`
- `EmptyState`
- `ErrorState`
- `ConfirmDialog`

### C. Feature components
- Feed domain:
  - `FeedList`
  - `FeedItemCard`
  - `FeedFilters`
- Room domain:
  - `VideoStage` (Daily mount point + lifecycle)
  - `ParticipantStrip`
  - `RoomControls`
  - `RoomStatusBanner`
  - `ChatPanel` (if present)

---

## 5) Screen-by-screen component map

This map defines each screen by **layout regions**, **required components**, and **interaction contracts**.

---

### Screen: `/` (Landing)

**Purpose**
- Explain product value and funnel users into dashboard/room onboarding.

**Layout regions**
- Top bar (lightweight public nav)
- Hero/content body
- CTA cluster

**Components**
- `TopNav`
- `PageHeader` (hero variant)
- `Button` (primary CTA, secondary CTA)
- `Card` (feature/value highlights)

**Interaction contracts**
- Primary CTA routes to authenticated app entry.
- Secondary links route to `/terms` and support/help.

---

### Screen: `/dashboard` (Feed/home)

**Purpose**
- Main operational hub with content/video entry points.

**Layout regions**
- App shell with top nav
- Main feed column
- Optional right context panel (filters/details)

**Components**
- `AppShell`
- `TopNav`
- `PageHeader`
- `FeedFilters`
- `FeedList`
- `FeedItemCard`
- `EmptyState` and `Skeleton` for loading

**Interaction contracts**
- Selecting a feed item can:
  - open lightweight details inline/drawer
  - or route to `/room/[roomId]` for interactive session
- Filters update URL query state (shareable links + back/forward integrity).

---

### Screen: `/room/[roomId]` (Video room)

**Purpose**
- Primary live video/call/watch experience.

**Layout regions**
- Top room header (room title/state/actions)
- Central media stage
- Bottom control strip
- Optional right panel for participants/chat/info

**Components**
- `AppShell` (room variant; can hide global nav noise)
- `RoomStatusBanner` (connecting/reconnecting/errors)
- `VideoStage` (Daily call object mount point)
- `ParticipantStrip`
- `RoomControls` (mute/cam/leave/fullscreen)
- `Drawer` or side panel for participants/settings/chat

**Interaction contracts**
- Room controls always available; keyboard shortcuts optional.
- Transient overlays auto-hide during passive watch mode.
- Hard failures show explicit fallback with retry + leave actions.

**Overlay policy**
- Allowed in-overlay: controls, volume, connection badge, participant quick peek.
- Avoid in-overlay: multi-step forms, account flows, deep navigation.

---

### Screen: `/blocked`

**Purpose**
- Explain gating/blocked state and next steps.

**Layout regions**
- Centered single-column message layout

**Components**
- `PageHeader`
- `Card` with rationale/status
- `Button` (support/contact/back)

**Interaction contracts**
- Must be navigable without hidden actions.
- Should include clear recovery/support path.

---

### Screen: `/terms`

**Purpose**
- Legal/read-only information.

**Layout regions**
- Minimal public shell, long-form content area

**Components**
- `TopNav` (public variant)
- `PageHeader`
- Rich text/prose container

**Interaction contracts**
- Section anchor links should deep-link reliably.

---

## 6) Daily integration blueprint (cross-reference into Sanctum)

### Integration boundary
Create one room-domain boundary component (`VideoStage`) that owns:
- Daily client/call object setup + teardown
- event subscriptions (joined, left, participant changes, network quality)
- media tile rendering decisions

All non-media app behavior (routing, global toasts, app shell navigation) stays outside this component.

### Data/event flow
1. Route enters `/room/[roomId]`
2. Room page fetches/session-validates room metadata
3. `VideoStage` initializes Daily with room/token
4. Room-scoped state drives:
   - connection banners
   - participant strip
   - control availability states
5. On leave/end, route transitions back to dashboard or previous context

### Why this is better than “just an overlay”
- Better lifecycle control (mount/unmount, reconnect behavior)
- Better testability (room UI can be tested independent of top-level navigation)
- Fewer z-index and focus-management issues

---

## 7) Navigation and URL strategy

To prevent current “links don’t work on deploy” regressions:
- Keep a **single route helper map** (no scattered string literals)
- Keep query-parameter contracts typed and centralized
- Ensure all navigation uses framework-native link/router primitives
- Add smoke checks for key routes in preview/prod:
  - `/`
  - `/dashboard`
  - `/room/[sample]`
  - `/blocked`
  - `/terms`
  - `/creator/deposit/initiate` (POST)
  - `/creator/veriff/session` (POST)

---

## 8) State matrix (minimum required)

Each major screen should define and support:
- `loading`
- `success`
- `empty`
- `error`
- `offline/reconnecting` (room only, strongly recommended)

For room specifically:
- `connecting`
- `joined`
- `reconnecting`
- `left`
- `denied`

---

## 9) Rollout plan (incremental, low-risk)

### Phase 1 — Foundation
- Introduce/normalize `AppShell`, tokens, primitives.
- No major feature logic changes yet.

### Phase 2 — Dashboard refactor
- Rebuild `/dashboard` with new shell + feed components.
- Keep existing room behavior untouched during this phase.

### Phase 3 — Room refactor with Daily boundary
- Introduce `VideoStage`, `RoomControls`, `ParticipantStrip`.
- Enforce overlay policy.

### Phase 4 — Hardening
- Route/link verification in deployed preview and production.
- Accessibility pass (focus traps, keyboard nav, contrast).

---

## 10) Success criteria (definition of done)

- Navigation is deterministic and consistent in Vercel preview + production.
- Dashboard and Room share shell primitives but remain mode-appropriate.
- Daily-specific implementation is isolated to room feature components.
- Overlay usage is constrained to transient controls, not core flows.
- Every major screen has documented loading/error/empty states.

---

## 11) Optional next artifacts to produce

1. Low-fidelity wireframes for each route listed above.
2. Component API draft (`props` contracts) for:
   - `AppShell`
   - `VideoStage`
   - `RoomControls`
   - `FeedItemCard`
3. A route-contract doc tying links/query params to user journeys.
