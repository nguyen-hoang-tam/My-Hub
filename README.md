# My Hub — Inventory Management + ZNS

Inventory management app (React + Ant Design + Vite) with a Cloudflare Worker backend using KV. Includes login, dark mode, collapsible sidebar, and Zalo ZNS notification integration.

## Features

- **Login** — sign-in form, user persisted to localStorage, sign-out from the account dropdown (top-right of the header)
- **Notes / Dashboard** — overview + charts, the default page after login
- **Product management** — CRUD products (add / edit / delete / search) via KV
- **ZNS settings** — template configuration, field mapping, triggers, test send, and ZNS send history
- **Dark mode** — toggle on the login page and in the header; persisted to localStorage (`myhub.theme`)
- **Sidebar** — blue background `#0047ad`, collapsible, `/logo.png` logo, navigation menu

## Scripts

```bash
npm run dev          # run dev (Vite + Cloudflare local, http://localhost:5173)
npm run build        # type-check (tsc -b) + build
npm run lint         # eslint
npm run preview      # build then preview
npm run deploy       # build + wrangler deploy
npm run cf-typegen   # regenerate worker-configuration.d.ts
```

## Project structure

```
├── worker/                      # Cloudflare Worker (API)
│   ├── index.ts                 # entry, /api/* routing
│   ├── storage.ts               # shared helpers: listJson, makeId, jsonError
│   ├── products.ts              # product CRUD (KV)
│   └── zns/
│       ├── index.ts             # /api/zns/* router
│       ├── types.ts             # ZnsConfigItem, ZnsHistoryItem
│       ├── configs.ts           # ZNS config CRUD
│       └── send.ts              # send Zalo ZNS, history, events
└── src/                         # React app
    ├── main.tsx                 # entry (global styles, CSS variables)
    ├── App.tsx                  # providers (ThemeProvider, ConfigProvider, AntApp), auth flow
    ├── auth.ts                  # User type + load/save/clear user (localStorage)
    ├── theme.tsx                # ThemeProvider (light/dark mode)
    ├── theme-context.ts         # ThemeContext + useTheme
    ├── api/
    │   ├── client.ts            # shared fetch helper
    │   ├── products.ts          # product types + API
    │   └── zns.ts               # ZNS types + API
    ├── components/
    │   ├── auth/
    │   │   └── Login.tsx        # sign-in form
    │   ├── layout/
    │   │   └── AppLayout.tsx    # collapsible sidebar, topbar, account dropdown, dark mode, layout styles
    │   └── products/
    │       └── ProductModal.tsx # add/edit product modal
    ├── pages/
    │   ├── Dashboard.tsx        # quick notes: overview + charts
    │   ├── Products.tsx         # product list (CRUD)
    │   └── zns/
    │       ├── ZnsConfigs.tsx   # config list + message template editor
    │       ├── ZnsConfigScreen.tsx # mapping/trigger/test-send config
    │       └── ZnsHistory.tsx   # ZNS send history
    ├── constants/
    │   └── zns.ts               # options, triggers, ZNS variables
    └── utils/
        └── format.ts            # formatDate, formatPrice
```

## Styling conventions

No standalone `.css` files. Styles are embedded directly in `.tsx` files via a template-string constant rendered with a `<style>` tag inside that component (e.g. `const styles = \`...\`` + `<style>{styles}</style>`). Shared classes (table, cells, search) live in `AppLayout.tsx`.

Dark mode uses the `data-theme` attribute on `<html>` (set by `ThemeProvider`). Components use the `[data-theme='dark']` selector to override hardcoded light backgrounds so they match antd's dark theme.
