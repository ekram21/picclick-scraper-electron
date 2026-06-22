# UI & Layout

## Problem it solves

Users need a consistent, modern desktop UI for navigation, window controls, and feature pages — matching macOS and Windows conventions while sharing one React codebase.

## How it solves it

React 19 + React Router + Tailwind CSS 4 + shadcn-style Radix components. Electron-specific chrome (title bar, drag regions) handled in layout components.

## File structure

```
src/
├── App.tsx                 # Routes
├── main.tsx                # Bootstrap, React Query, Toaster
├── index.css               # Tailwind theme, app-drag utilities
├── pages/                  # Feature screens (see per-page docs)
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx   # Shell: TitleBar + Sidebar + main
│   │   ├── TitleBar.tsx    # Draggable header, window controls
│   │   ├── Sidebar.tsx     # Navigation
│   │   └── UpdateBanner.tsx
│   └── ui/                 # shadcn primitives (button, card, input, ...)
└── lib/utils.ts            # cn(), formatPrice, formatRelativeTime
```

## Layout hierarchy

```
AppLayout
├── TitleBar          (48px, platform-specific)
├── flex row
│   ├── Sidebar       (256px, nav links)
│   └── column
│       ├── UpdateBanner   (conditional OTA message)
│       └── main           (scrollable page content)
```

## Routes (`App.tsx`)

| Path | Page |
|------|------|
| `/` | DashboardPage |
| `/watchers` | WatchersPage |
| `/watchers/new` | WatcherFormPage |
| `/watchers/:id` | WatcherFormPage (edit) |
| `/alerts` | AlertsPage |
| `/settings` | SettingsPage |

## TitleBar (`TitleBar.tsx`)

| Platform | Behavior |
|----------|----------|
| macOS | Native traffic lights (positioned via `trafficLightPosition` in main); draggable header; SF Pro font |
| Windows/Linux | Custom min/max/close buttons; centered title; Segoe UI |

CSS classes: `app-drag`, `app-no-drag` in `index.css` (`-webkit-app-region`).

Window IPC: `window.api.window.*` — see [IPC.md](./IPC.md).

## Sidebar (`Sidebar.tsx`)

Uses `NavLink` from react-router-dom with active state styling (emerald highlight).

## UI components (`components/ui/`)

Built on Radix UI + `class-variance-authority` + Tailwind. Pattern:

```typescript
import { cn } from '@/lib/utils'
```

| Component | Used for |
|-----------|----------|
| `Button` | Actions, links |
| `Card` | Section containers |
| `Input` / `Textarea` | Forms |
| `Select` / `Switch` / `Tabs` | Watcher form, settings |
| `Badge` | Status chips |

## State management

- **Server state:** `@tanstack/react-query` — IPC calls as `queryFn` / `mutationFn`
- **Forms:** `react-hook-form`
- **Toasts:** `sonner`

Invalidate queries after mutations, e.g. `queryClient.invalidateQueries({ queryKey: ['watchers'] })`.

## Theming

Dark theme default in `index.css` `@theme` block. CSS variables: `--color-primary` (emerald), `--color-background` (zinc-950).

Platform font overrides via `html[data-platform='mac'|'win']`.

## How to extend

### New page

1. Create `src/pages/MyPage.tsx`
2. Add route in `App.tsx`
3. Add `NavLink` in `Sidebar.tsx`
4. Follow existing Card + heading pattern

### New shadcn component

Copy component into `src/components/ui/` following existing patterns (Radix + `cn()`).

### Light mode

Wire `AppSettings.theme` to toggle `class="dark"` on `<html>` in a root effect.

## Related docs

- [DASHBOARD.md](./DASHBOARD.md)
- [SETTINGS.md](./SETTINGS.md)
- [IPC.md](./IPC.md)
