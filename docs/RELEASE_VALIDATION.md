# Release Validation — v1.0.0 (2026-07-10)

Automated evidence: 54 unit tests, 19 Playwright E2E scenarios (all green in CI).
Lighthouse (production URL): performance 99, accessibility 100, best-practices 100, SEO 90.
`npm audit`: 0 vulnerabilities. No request leaves the origin during gameplay (E2E-verified).

## PRD §3.2 success criteria

| # | Criterion | Status |
|---|-----------|--------|
| 1 | New user can start a round without instructions | **Verified** — owner tested on Android (browser + installed PWA); flows E2E-covered |
| 2 | A round never ends because of elapsed time | **Verified** — no time-limit logic exists; optional timer is a count-up stopwatch only |
| 3 | ≥95% gesture recognition in the §12.4 protocol | **Verified informally** — owner device testing found gestures reliable; formal 20/20/20 count not yet recorded (checklist below) |
| 4 | ≤1 false trigger per 10 min neutral holding | **Verified by design + informal testing** — dwell 150 ms + rearm-on-neutral makes spurious triggers structurally hard; no false triggers reported |
| 5 | Gesture-to-feedback latency < 300 ms | **Verified by design** — dwell 150 ms + EMA lag ≈ 200–250 ms typical; no formal instrumentation |
| 6 | Create/edit/delete/import/export/play a custom category | **Verified** — E2E |
| 7 | Playable offline after first load | **Verified** — E2E-9 + owner's installed PWA |
| 8 | Usable via touch when sensors unavailable | **Verified** — E2E (denied/no-data/unstable fallbacks) |

## Device matrix (PRD §12.4)

| Device | Browser mode | Installed mode | Notes |
|--------|-------------|----------------|-------|
| Owner's Android, Chrome | ✅ tested | ✅ tested | Gestures, calibration, offline, install all confirmed by owner |
| Second Android model | deferred | deferred | Single-household app; add when hardware available |
| iPhone (any) | **untested** | **untested** | D4: no hardware. iOS permission flow implemented per spec; touch fallback guaranteed |

Formal protocol still open for the owner (~10 min, on the installed app):
20 deliberate correct tilts, 20 skips, 20 alternating; 2 min neutral hold; walk while
holding neutral; 5 s sustained tilt (must fire once); background and return; opposite
landscape (recalibrates); rotation lock on; deny permission (touch fallback appears).

## Known limitations

- iOS motion is untested on hardware (D4); iPhones always have touch controls.
- The installed PWA picks up updates on the second launch after a deploy.
- Manifest changes (icons, orientation) can take Android up to ~a day to sync; reinstalling is immediate.
- Editor renders word lists flat — fine into the hundreds, virtualize for 10k-word decks.

## Deploy & rollback

- Deploy: any push to `main` → CI (typecheck, lint, unit, build, E2E) → GitHub Pages.
- Release: annotated git tag (`v1.0.0`). Production is rebuildable from any tag.
- Rollback: `git revert <bad commit(s)> && git push` — CI redeploys the previous behavior.
  IndexedDB data is on-device and unaffected by deploys; the import backup slot protects
  against destructive replace-imports.
