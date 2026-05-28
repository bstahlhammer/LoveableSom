# `src/core` — Business logic & data layer

Everything in this folder is the **"backend" of the app today**: data shapes,
scoring engines, and (eventually) calls to a real backend.

## The contract

The UI layer (`src/ui/**`) and the app shell (`src/UncorkApp.jsx`) **must
only import from `src/core/api.js`**. Never import directly from
`core/data/*` or `core/engine/*` outside this folder.

That single rule is what lets you redesign screens, swap themes, rework
onboarding, etc. without ever risking the data model or scoring math.

## Folder layout

```
src/core/
├── api.js           ← public contract (UI imports from here only)
├── data/            ← mock data today; later: API clients / DB queries
│   └── mockData.js
└── engine/          ← pure business logic, framework-agnostic
    ├── matchEngine.js
    ├── sortEngine.js
    └── approachabilityEngine.js
```

## When you add a real backend

When the app moves to Lovable Cloud (or any real backend), only `api.js`
changes. Each exported function becomes a server-function call instead of a
local lookup. UI files don't change at all.

```js
// before
export function getWines() {
  return wines
}

// after (illustrative)
import { fetchWines } from './remote/wines.functions'
export function getWines() {
  return fetchWines()
}
```

## What does NOT belong in `core/`

- React components, JSX, styles, theme tokens → `src/ui/`
- Routing → `src/routes/`
- Animations, transitions → `src/ui/components/`
