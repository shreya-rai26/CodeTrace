# Frontend redesign

## What changed

- Shared navy, white and muted indigo design tokens, responsive application shell, desktop sidebar and native modal navigation on mobile.
- Assignment overview: API-derived KPI cards, assignment/course search, status filtering, improved table and create dialog.
- Assignment review: upload / analysis / evidence workflow, status badges, saved-threshold statistics, a five-bin similarity distribution and refreshed match results.
- Existing d3-force graph preserved, including edge navigation and keyboard activation; refreshed palette, legend, background and empty explanation.
- Comparison: two independently scrollable source panes, filenames, line numbers, matching-line highlights, highlight toggle and jump-to-first-match controls. Blank lines remain excluded from highlights.
- Login and registration styling, skeletons, retryable read errors, empty states, focus indicators, skip navigation and reduced-motion CSS.
- Frontend package lock added for repeatable installs. Runtime dependency declarations are unchanged. External font downloads were removed; the interface uses a system-font stack.

## Preserved contracts

No backend, database, ML service or API client changes. Existing bearer-token handling, 401 redirect, routes, request payloads, ZIP multipart `file` field, analysis polling, AI reference upload/removal and assignment deletion remain in place.

## Metric definitions

| Metric | Source |
| --- | --- |
| Total assignments | `assignments.length` |
| Student submissions | Sum of `submission_count`; reference files excluded by the existing API |
| Analysed assignments | Assignments with status `done` |
| Overview flagged pairs | Sum of `flagged_pairs` for completed assignments only; includes reference matches |
| Detail compared / flagged pairs | `matches.length` / count of `matches.flagged` |
| Similarity groups | `clusters.length` from the detail response |
| Distribution | All returned `matches.score` values in [0,.2), [.2,.4), [.4,.6), [.6,.8), [.8,1] |
| Comparison scores / threshold | Match response and saved assignment threshold |

No trends, accuracy claims or invented production metrics were added. Similarity remains evidence for review, not a verdict.

## Validation

`npm run build` passes with the existing Vite 6 dependency range. Browser verification uses the actual production build and isolated API fixtures; no fixture data is imported into the application bundle.

Checked login/registration, auth guarding and 401 expiry, overview KPIs/search/filter/create, ZIP request contract and invalid-file handling, analysis polling, reference upload/removal, deletion confirmation, saved result KPIs, distribution endpoints, graph keyboard navigation, comparison highlights, error retries, skeleton/empty/failed states, sign-out and mobile navigation. Comparison layouts were checked at 1440, 1024, 768 and 390 pixels, with no page overflow; overview and detail were also checked at 390 pixels. No browser runtime errors occurred.

Desktop login, overview, detail, comparison and mobile layouts were visually inspected. The local backend was unavailable, so live PostgreSQL/ML-backed end-to-end analysis was not executed.

## Run

Existing Docker/start scripts remain applicable. For frontend development, from `frontend`:

```sh
npm ci
npm run dev
```

For the optional isolated browser regression checks, build the frontend first, then:

```sh
cd tests
npm install
npm test
```

Tests use installed Chrome at its standard Windows location. Set `BROWSER_EXECUTABLE` for another browser binary; on other systems install Playwright Chromium with `npx playwright install chromium`. Test dependencies are isolated from the application package. The checks fulfil built assets from disk and API fixtures in memory, so they do not require a server or alter a real account.
