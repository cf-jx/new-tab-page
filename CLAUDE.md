# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Browser extension (new tab page) built with Vue 3 + TypeScript on WXT framework. Supports Chrome, Firefox, and Edge with browser-specific manifest configurations.

## Key Architecture Patterns

### Entry Points Structure
- `entrypoints/newtab/` - Main new tab page application (Vue 3 SFC)
- `entrypoints/background/` - Background service worker for sync queue processing
- Entry points are auto-discovered by WXT; HTML entry at `entrypoints/newtab/index.html` → `init.ts` → `main.ts`

### Shared Modules (`shared/`)
Cross-cutting concerns organized by domain:
- `settings/` - Settings management with versioned migrations
- `i18n.ts` - Runtime i18n with dynamic resource loading
- `sync/` - Cross-device sync using message passing and alarms
- `bookmark/`, `customSearchEngine/` - Domain-specific storage
- `network/` - Fetch utilities (including JSONP for CORS)
- `media/` - Media type detection helpers

### Settings System
Settings follow a versioned migration pattern:
- Current version defined in `shared/settings/current.ts` (CURRENT_CONFIG_VERSION)
- Default values in `shared/settings/default.ts`
- Type definitions in `shared/settings/types/v{version}.d.ts`
- Migrations in `shared/settings/migrate/` (migrateFromVer{X}To{Y})
- Store: `useSettingsStore()` (Pinia) persisted via `settingsStorage` (localforage)
- Chrome/Edge: Reads legacy `chrome.storage.local` and migrates on init
- Settings auto-save with debouncing (500ms); theme color saves immediately

### Background Sync Architecture
Service worker (`entrypoints/background/index.ts`) manages sync queue:
- Message-based communication: `SYNC_REQUEST` → enqueue, `SYNC_UPDATE` → notify tabs
- Queue aggregation: Keeps most recent `lastUpdate` snapshot, discards older items
- Dual timing: Local timers + browser alarms API (alarms wake SW after suspension)
- Non-syncable fields reset: Local/online wallpapers → Bing default (see bgType reset logic)
- Throttled processing: 2-second minimum interval between syncs

### i18n System
- `i18next` with dynamic resource loading via `vite-plugin-i18next-loader`
- Resources at `@/locales/${lng}/${ns}.json`
- Special zh fallback: zh-MO→zh-HK, generic zh→zh-CN
- Manifest strings: `public/_locales/*/messages.json` (WebExtension standard)
- Windows zh-TW auto-switches to zh-HK based on timezone

### Build Configuration
WXT config (`wxt.config.ts`) branches manifests per browser:
- Firefox: `topSites`, `storage`, `alarms`, `bookmarks`; overrides homepage
- Chrome/Edge: adds `favicon`, uses `optional_host_permissions` for `*://*/*`
- Host permissions: Bing, Baidu, Google suggest APIs, jinrishici; dev adds localhost

Vite plugins stack:
- `@vitejs/plugin-vue` - Vue SFC compilation
- `unplugin-vue-markdown` - Markdown as SFC (custom mdit plugins for changelog)
- `unplugin-auto-import` + `unplugin-vue-components` - Auto-import Vue APIs and Element Plus
- `vite-plugin-i18next-loader` - i18n resource loading
- `vite-svg-loader` - SVG as components

Path aliases:
- `@` → repo root
- `@newtab` → `entrypoints/newtab/`

Global SCSS injection: `@/assets/styles/element/index.scss` via Vite preprocessorOptions

## Development Commands

### Run Development Server
```bash
pnpm dev              # Chrome (default)
pnpm dev:firefox      # Firefox
pnpm dev:edge         # Edge
```
Outputs unpacked extension to `.output/{browser}-mv3` with HMR

### Build for Production
```bash
pnpm build            # Chrome
pnpm build:firefox    # Firefox
pnpm build:edge       # Edge
```
Type-checks first (`vue-tsc --build`), then builds extension

### Create Distribution Packages
```bash
pnpm zip              # Chrome
pnpm zip:firefox      # Firefox
pnpm zip:edge         # Edge
```

### Quality Checks
```bash
pnpm type-check       # TypeScript validation
pnpm lint             # Run all linters (oxlint + eslint + stylelint)
pnpm lint:oxlint      # Fast correctness linting
pnpm lint:eslint      # ESLint with auto-fix
pnpm lint:style       # Stylelint for CSS/SCSS/Vue
pnpm format           # Prettier formatting
```

### Testing
```bash
npx playwright test   # Run Playwright tests
```
Tests use unpacked extension from `.output/chrome-mv3`; example in `tests/newtab.spec.ts`

## Common Development Patterns

### Reading/Modifying Settings
```ts
import { useSettingsStore, saveSettings } from '@/shared/settings'
const settings = useSettingsStore()

// Read
console.log(settings.search.searchEngines)

// Modify (auto-saved via $subscribe with debouncing)
settings.search.searchEngines = [...]
```

### Adding a New Setting
1. Add default value in `shared/settings/default.ts`
2. Update type in `shared/settings/types/v{current}.d.ts`
3. If breaking change:
   - Bump `CURRENT_CONFIG_VERSION` in `shared/settings/current.ts`
   - Create migration in `shared/settings/migrate/`
   - Export migration from `shared/settings/index.ts`

### Updating Host Permissions
Edit `baseManifest.host_permissions` in `wxt.config.ts`, then rebuild

### Working with Background Wallpapers
- Local images/videos stored in IndexedDB via `wallpaperStore` (localforage)
- Upload: `uploadBackground(file, isDarkMode)` - creates blob URL, stores in DB
- Reload: `reloadBackground(isDarkMode)` - regenerates blob URL on app init
- Validates media files; auto-cleans invalid data
- Sync resets local/online wallpaper fields to Bing default (see `entrypoints/background/index.ts:56-68`)

### Component Auto-Import
Element Plus components and Vue APIs are auto-imported:
- Type definitions regenerated at `types/auto-imports.d.ts` and `types/components.d.ts`
- After changing resolvers, run `pnpm install` or `pnpm dev` to regenerate

## Important Caveats

### Settings Changes
Always update defaults + types + migrations together to prevent runtime errors

### HMR Issues
If HMR stalls, manually reload the unpacked extension in browser DevTools

### Manifest Permissions
Keep changes minimal; test permission prompts when adding host_permissions

### Background Sync
- Uses message passing (`browser.runtime.sendMessage`) - not direct function calls
- Alarms API wakes service worker; don't rely on long-running timers in background
- Queue aggregation means intermediate states may be skipped (by design)

### Multi-Browser Support
Test manifest changes in target browsers; Firefox and Chrome have different permission models
