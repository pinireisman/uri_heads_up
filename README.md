# UriHeadsUp

A forehead-guessing party game (Heads Up! style) as an offline-capable PWA. Hold the phone to
your forehead, friends describe the word, tilt down for correct, tilt up to skip. No timer.

- Product spec: [prd.md](prd.md)
- Plan: [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md)
- Decisions: [docs/DECISIONS.md](docs/DECISIONS.md)

## Development

```sh
npm ci
npm run dev        # local dev server
npm run typecheck  # tsc, strict
npm run lint       # oxlint
npm test           # vitest
npm run build      # production build to dist/
```

Deployed to GitHub Pages from `main` by CI.

## Install on a phone

Open https://pinireisman.github.io/uri_heads_up/ once while online, then:

- **Android Chrome:** tap the **Install app** button on the home screen (or menu → "Add to Home screen").
- **iPhone Safari:** Share → "Add to Home Screen".

After the first load the app works fully offline, including gameplay and imports.

**Device support note:** motion gestures are validated on Android Chrome. The iOS motion
permission flow is implemented per spec but untested on real hardware; iPhones can always
play with touch controls.
