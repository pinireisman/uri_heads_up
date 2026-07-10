# Implementation Plan — UriHeadsUp (TiltGuess PWA)

Source: [prd.md](../prd.md). Decisions: [DECISIONS.md](DECISIONS.md).
Rule carried over from the PRD: **nothing past Phase 1 is low-risk until the sensor gate passes on a real Android phone.**

## Stack

Vite + React + TypeScript strict · Vitest · Playwright (from Phase 3) · `idb` · Zod · `vite-plugin-pwa` · hash routing · hand-rolled i18n (en/he, RTL).

## Architecture (trimmed from PRD §10.2)

```
src/
  i18n/            # locale dicts, useT(), dir switching
  domain/          # round engine, category/word models, scoring — pure, no browser APIs
  sensors/         # permission, orientation normalizer, calibration, gesture state machine
  persistence/     # repository interface, idb implementation, migrations, in-memory test impl
  importexport/    # zod schemas, normalization, merge/add/replace strategies, backup
  ui/              # screens + shared components
  pwa/             # wake lock, install guidance
```

Boundaries enforced (PRD §10.3): round engine never touches sensors or IndexedDB; UI never touches IndexedDB directly; gesture classifier is a pure module fed normalized samples — unit-testable and injectable for E2E.

---

## Phase 0 — Scaffold (small)

1. Vite + React + TS strict scaffold; ESLint + Prettier; Vitest.
2. i18n foundation: `en.ts`/`he.ts` dictionaries, locale context, `<html dir lang>` switching. Every string from day one goes through `t()`.
3. GitHub repo + Actions CI (typecheck, lint, test, build) + Pages deploy on main.

**Gate:** CI green; empty app served over HTTPS from Pages, loadable on the owner's Android phone.

## Phase 1 — Sensor spike (the risk)

Standalone `#/diag` route, no gameplay dependencies:

1. Permission flow: iOS `requestPermission()` path (implemented per spec, untested — D4), Android no-op path, denied/unsupported/no-events states.
2. Orientation normalizer: raw α/β/γ + screen-orientation → single normalized pitch relative to calibrated neutral. Handles both landscape directions.
3. Calibration: sample during 3-s countdown, reject if unstable, compute baseline.
4. Gesture state machine (pure module, PRD FR-6 states): neutral zone ±15°, threshold ~35°, dwell 120–200 ms, lockout 350–500 ms, rearm on neutral 200–300 ms, EMA filter. Constants in one tunable config object — final values come from device testing, not this document.
5. Diag view shows raw/normalized/filtered pitch, state, transitions (PRD §13).
6. Owner runs the PRD §12.4 protocol on Android Chrome (browser + installed); tune thresholds from results.

**Gate (PRD Phase 1):** correct + skip both reliable on the owner's Android; no repeat-trigger on sustained tilt; denial falls back cleanly. Unit tests cover the state machine and normalizer.

## Phase 2 — Domain, storage, import/export

1. Models, round engine: shuffle, no-repeat, exhaustion → deck complete, correct/skipped/unclassified scoring, result correction.
2. `CategoryRepository` interface + idb implementation + in-memory test double; schema version + migration hook; settings repository.
3. Import: zod validation (both PRD FR-10 formats), limits (5 MB / 1 000 categories / 10 000 words / 200-char words), normalization, duplicate detection, preview data, add/merge/replace strategies, pre-replace backup, transactional write. Export with schema version.
4. One demo starter category (original content, en + he words).

**Gate:** all domain/import unit tests pass; data survives reload; invalid import cannot corrupt existing data; replace is recoverable from backup.

## Phase 3 — Core UI (touch-only gameplay)

1. Screens: Home (FR-1), Category detail (FR-2), Editor (§6.3–6.4 incl. paste list / dedupe / sort / enable-disable), Import/Export (§6.5–6.6), Settings (FR-14 basic set), Gameplay with touch + keyboard controls (FR-7), Results with status correction (FR-8).
2. Landscape gameplay layout, portrait "rotate your phone" prompt, auto-scaling word text, ≥400 ms feedback states with non-color indicators.
3. RTL pass: every screen verified in Hebrew.
4. Playwright E2E with injected synthetic sensor samples: the 10 mandatory scenarios from PRD §12.3.

**Gate:** full round playable by buttons; create-and-play a custom category; import/export through the UI; E2E suite green in CI.

## Phase 4 — Sensor integration

1. Wire the approved Phase-1 sensor module into gameplay via the round engine (same action path as buttons).
2. Calibration onboarding flow (§6.2, FR-5), permission recovery copy, sensitivity presets + invert setting, advanced threshold settings with reset.
3. Diag view moved behind a settings/dev flag.

**Gate:** re-run §12.4 protocol on Android — accuracy per PRD §3.2 (≥95 % recognition, ≤1 false trigger / 10 min, <300 ms latency); one gesture = one classification; denial doesn't block play.

## Phase 5 — PWA & offline

1. Manifest (standalone, landscape preference), icons, `vite-plugin-pwa` precache.
2. Wake lock with release/reacquire handling (FR-12); install guidance; optional fullscreen attempt that degrades silently (FR-13).
3. Offline verification: airplane-mode round on the Android device, browser and installed modes.

**Gate:** installable; full gameplay offline after first load; wake-lock failure harmless.

## Phase 6 — Release validation

1. Full automated suite + Lighthouse PWA audit.
2. Android device matrix run (browser + installed, rotation-lock on, backgrounding, walking test). iPhone marked **untested — touch fallback** in README (D4).
3. Long/RTL word rendering, malformed-import battery, no-network-traffic check (§15).
4. Tag release; Pages deploy is rebuildable from the tag (rollback = redeploy previous tag).

**Gate:** PRD §3.2 success criteria each marked verified / deferred-with-reason.

---

## Explicitly skipped (add only when needed)

- The PRD's 8-agent role structure, traceability matrix, UX_FLOWS.md, screen-spec docs — the plan + code + tests are the artifacts (D3).
- iPhone real-device validation — blocked on hardware (D4).
- Staging environment — Pages `main` deploy is staging and production for a private-link app; split only if it ever gets real traffic.
- Sounds — setting exists (default off); actual audio files can land any time after Phase 3.
