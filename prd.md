Below is a development-ready **PRD v0.1**. It makes reasonable MVP assumptions so the agentic workflow can begin, while isolating the remaining product decisions in the final section.

# Product Requirements Document: TiltGuess PWA

**Status:** Draft v0.1
**Working title:** UriHeadsUp([MDN Web Docs][1]) Application
**Primary platforms:** iPhone and Android phones
**Reference interaction:** A category-based guessing game in which the phone is held against the player’s forehead and tilted to classify a word as correctly guessed or skipped, similar to the interaction demonstrated in the referenced “How to Play Heads Up!” video. ([YouTube][2]Product vision

Create a lightweight, installable mobile web game in which:

1. A player selects a category.
2. The phone displays one word at a time while being held against the player’s forehead.
3. Other players describe the word without saying it.
4. The phone holder:

   - Tilts the phone **down** when the word was guessed correctly.
   - Tilts the phone **up** to skip the word.

5. The next word is displayed automatically.
6. There is **no round timer**. A round continues until the player manually ends it or the selected deck is exhausted.
7. Categories and words can be:

   - Created and edited inside the application.
   - Imported from a JSON file.
   - Exported to a JSON file for backup or sharing.

The application should feel like a native mobile app while remaining deployable as a website.

---

## 2. Product principles

### 2.1 Website first

The MVP will be a progressive web application rather than separate native iOS and Android applications.

It should:

- Run directly from a browser.
- Be installable on the phone’s home screen.
- Work offline after its first successful load.
- Store game content locally on the device.
- Require no user account or backend service for the MVP.

Apple supports adding a website to the iPhone Home Screen and opening it as a web app. ([Apple Support][3])cal gestures must be reliable

Gesture detection is the highest-risk part of the product. It must be developed and validated before extensive UI work.

The implementation must use calibration, filtering, hysteresis, neutral-position detection, and a cooldown state. It must not classify a gesture from a single raw sensor reading.

### 2.3 Graceful fallback

Motion control is the primary interaction, but the application must remain usable when:

- Motion permission is denied.
- The browser does not expose usable orientation data.
- A desktop browser is used.
- The device’s sensors are unreliable.

Fallback controls will provide large **Correct**, **Skip**, and **End Round** buttons.

### 2.4 Local-first and private

The default MVP will:

- Send no category, word, game, or sensor data to a server.
- Use no account.
- Use no advertising SDK.
- Use no analytics unless explicitly enabled in a later decision.
- Store imported and edited content on the device.

---

## 3. Goals

### 3.1 MVP goals

The MVP must provide:

- Category selection.
- Unlimited-duration rounds.
- Correct and skip gestures.
- Reliable motion permission onboarding.
- Calibration before each round.
- Manual controls as a fallback.
- Correct and skipped-word tracking.
- An end-of-round summary.
- Category and word management.
- JSON import and export.
- Offline operation after installation or initial loading.
- Responsive support for modern iPhones and Android phones.
- Original branding, styling, sounds, and content.

### 3.2 Success criteria

The MVP is successful when:

1. A new user can open the application, choose a category, grant motion permission, and start a round without external instructions.
2. A round never ends because of elapsed time.
3. At least 95% of deliberate up/down gestures are classified correctly during the agreed real-device test protocol.
4. The false-trigger rate is no more than one unintended classification during ten minutes of ordinary neutral holding and movement.
5. Gesture-to-feedback latency is normally below 300 ms.
6. A user can create, edit, delete, import, export, and play a custom category.
7. The application remains playable after connectivity is removed following the initial successful load.
8. The game is usable through touch controls when sensor access is unavailable.

---

## 4. Non-goals for the MVP

The following are excluded unless subsequently added:

- Native App Store or Google Play releases.
- User registration.
- Cloud synchronization.
- Remote multiplayer.
- Voice recognition.
- Automatic detection of spoken answers.
- Video recording.
- Paid content or subscriptions.
- Advertising.
- Public sharing or marketplace for decks.
- AI-generated categories.
- Images or video as guessing prompts.
- Reproduction of another application’s branding, artwork, sounds, wording, or proprietary category content.

The architecture should not prevent later addition of cloud synchronization or native packaging, but the MVP should not implement them.

---

## 5. Assumed game model

### 5.1 Round lifecycle

The assumed round flow is:

1. Open the application.
2. Select one category.
3. Review the category name and word count.
4. Tap **Start Round**.
5. Grant motion permission if required.
6. View a short gesture tutorial or calibration prompt.
7. Hold the phone in the neutral playing position.
8. Complete a three-second start countdown.
9. Play without a time limit.
10. End the round by:

    - Tapping **End Round**, or
    - Exhausting the category’s available words.

11. Review the results.
12. Replay the category, choose another category, or return home.

The three-second start countdown is not a round timer. It exists only to let the player position the phone and establish a neutral sensor baseline.

### 5.2 Word selection

Default MVP behavior:

- Shuffle the selected category at the beginning of the round.
- Show each enabled word no more than once in that round.
- Maintain the round’s word order in memory.
- When every enabled word has been used, end the round and show **Deck complete**.
- Starting another round reshuffles the deck.
- Correctly guessed and skipped words are both considered used for that round.

### 5.3 Scoring

For each displayed word, store one of:

- `correct`
- `skipped`
- `unclassified` if the round is ended while the word is visible

The summary screen displays:

- Correct count.
- Skipped count.
- Correct words.
- Skipped words.
- Unclassified final word, where applicable.
- Total presented words.

A review mode should allow the user to change an incorrectly recorded result before leaving the summary screen.

---

## 6. Primary user journeys

### 6.1 Play a built-in or existing category

1. User opens the application.
2. Home screen displays available categories.
3. User selects a category.
4. Application displays category details.
5. User taps **Start Round**.
6. Application obtains required permissions and calibrates.
7. Words are displayed one at a time.
8. Tilting down records **Correct**.
9. Tilting up records **Skip**.
10. User ends the round.
11. Application displays the round summary.

### 6.2 First-time motion permission

1. User taps **Start Round**.
2. Application explains why motion access is needed.
3. User taps **Enable Motion Control**.
4. The browser permission request is issued directly from that tap.
5. On approval, the application opens the calibration screen.
6. On denial or failure, the application explains how to continue using touch controls.

On browsers that expose `DeviceOrientationEvent.requestPermission()`, the request must be made from a direct user interaction and in a secure HTTPS context. ([MDN Web Docs][1])on must never request permission automatically during initial page load.

### 6.3 Create a category

1. User opens **Manage Categories**.
2. User selects **New Category**.
3. User enters:

   - Category name.
   - Optional description.
   - Optional emoji or icon.
   - Optional theme color.

4. User adds words individually or pastes multiple words.
5. Application validates the category.
6. User saves it.
7. The category immediately becomes available for play.

### 6.4 Edit a category

The user can:

- Rename a category.
- Change its description, icon, or color.
- Add words.
- Edit words.
- Delete words.
- Enable or disable words.
- Paste a newline-separated list.
- Remove duplicates.
- Sort words alphabetically.
- Delete the category after confirmation.

### 6.5 Import JSON

1. User opens **Import / Export**.
2. User selects a JSON file.
3. Application parses and validates the file locally.
4. Application displays an import preview:

   - Number of categories.
   - Number of words.
   - Validation warnings.
   - Duplicate categories or words.

5. User chooses:

   - **Add as new categories**
   - **Merge with existing categories**
   - **Replace all categories**

6. Destructive replacement requires confirmation.
7. Application creates a local backup before replacement.
8. Import results are displayed.

### 6.6 Export JSON

The user can export:

- All categories.
- A selected category.
- Optionally, only enabled words.

The generated JSON must include a schema version.

---

## 7. Functional requirements

## FR-1: Home screen

The home screen must contain:

- Product name and original branding.
- A scrollable category list.
- Word count for each category.
- A visual indication of disabled or empty categories.
- **Manage Categories** action.
- **Import / Export** action.
- **Settings** action.
- Install guidance when appropriate.
- A short explanation of the gesture controls.

An empty category cannot be started.

## FR-2: Category detail

The category detail view must display:

- Category name.
- Description.
- Number of enabled words.
- **Start Round**.
- **Edit Category**.
- Optional recent-round summary if history is enabled.

## FR-3: Gameplay display

During active play:

- The word occupies most of the display.
- Text automatically scales to fit.
- The view is optimized for landscape use.
- The word remains legible from approximately one to three metres away.
- No round timer is displayed.
- No countdown or progress bar implies a time limit.
- A subtle count such as `7 presented` may be shown if enabled.
- Correct and skip feedback is visually distinct.
- Touch controls are available but visually secondary when motion control is active.
- An **End Round** control is available without making accidental activation likely.

Suggested feedback:

- Correct: green confirmation state, optional sound.
- Skip: amber/orange confirmation state, optional sound.
- Sensor unavailable: persistent but unobtrusive notice with touch controls.

Colors must not be the only way the result is communicated.

## FR-4: Motion permission

The application must:

- Detect whether a permission method is required.
- Request permission only after an explicit tap.
- Handle `granted`, `denied`, rejected, unsupported, and no-data states.
- Remember the application’s last known permission outcome locally without assuming that browser permission remains granted.
- Provide platform-appropriate recovery instructions.
- Allow the user to continue with touch controls.

## FR-5: Calibration

Before every motion-controlled round:

1. Ask the player to rotate the phone to landscape.
2. Ask the player to hold the phone against the forehead in the normal playing position.
3. Collect orientation samples during the start countdown.
4. Reject calibration if readings are absent or excessively unstable.
5. Calculate a neutral baseline from stable samples.
6. Start the round only after calibration succeeds.
7. Offer **Retry Calibration** and **Use Touch Controls**.

Screen-orientation locking may be attempted where supported, but it must not be required because programmatic orientation locking has limited browser availability. ([MDN Web Docs][4])ure classification

The gesture classifier must be implemented as a framework-independent module.

It receives normalized orientation samples and emits:

- `CORRECT`
- `SKIP`
- Diagnostic state changes

Recommended initial behavior:

- Neutral zone: within approximately ±15° of the calibrated position.
- Gesture threshold: approximately 35° from neutral.
- Minimum threshold dwell: 120–200 ms.
- Feedback lockout: approximately 350–500 ms.
- Rearm only after returning to the neutral zone for at least 200–300 ms.
- Apply an exponential moving average or short rolling median to sensor values.
- Ignore isolated spikes.
- Recalibrate when screen orientation changes materially.
- Prevent a sustained tilted position from advancing through multiple words.

The final thresholds must be determined empirically through the sensor prototype and device testing.

### Gesture state machine

The implementation should use these conceptual states:

- `UNAVAILABLE`
- `CALIBRATING`
- `NEUTRAL`
- `CORRECT_CANDIDATE`
- `SKIP_CANDIDATE`
- `FEEDBACK_LOCKED`
- `WAITING_FOR_NEUTRAL`
- `PAUSED`

Transitions must be deterministic and unit-testable.

### Orientation normalization

Raw browser orientation values must not be consumed directly by gameplay code.

A sensor adapter must:

1. Read device orientation events.
2. Determine current screen orientation.
3. Transform raw values into a normalized relative pitch.
4. Subtract the calibrated neutral position.
5. Filter noise.
6. send normalized samples to the gesture classifier.

The web orientation specification exposes physical device orientation through `alpha`, `beta`, and `gamma`, and the device coordinate frame is defined relative to the device’s standard orientation rather than automatically changing with screen rotation. The normalization layer is therefore required. ([W3C][5])al controls

When enabled, gameplay must offer:

- **Correct**
- **Skip**
- **End Round**
- **Pause**, if pause functionality is included

Manual actions must pass through the same round engine as gesture actions.

Keyboard controls should also be available for desktop testing:

- Down arrow: Correct.
- Up arrow: Skip.
- Escape: End or pause round.
- Space: Continue from feedback if needed.

## FR-8: Results

The results screen must show:

- Category.
- Correct count.
- Skipped count.
- Presented count.
- Correct-word list.
- Skipped-word list.
- Any unclassified final word.
- Ability to move a word between statuses.
- **Play Again**.
- **Choose Category**.
- **Home**.

## FR-9: Category storage

The application must persist:

- Categories.
- Words.
- Enabled states.
- Settings.
- Optional game history.
- Schema version.
- Import backup.

IndexedDB is the recommended primary store. Storage access must be encapsulated behind a repository interface so that cloud synchronization could be added later.

## FR-10: JSON schema

Canonical export format:

```json
{
  "schemaVersion": 1,
  "exportedAt": "2026-07-10T12:00:00.000Z",
  "categories": [
    {
      "id": "animals",
      "name": "Animals",
      "description": "Common and unusual animals",
      "icon": "🐘",
      "color": "#4F7CAC",
      "enabled": true,
      "words": [
        {
          "id": "giraffe",
          "text": "Giraffe",
          "enabled": true
        },
        {
          "id": "platypus",
          "text": "Platypus",
          "enabled": true
        }
      ]
    }
  ]
}
```

The importer should also support this simplified format:

```json
{
  "schemaVersion": 1,
  "categories": [
    {
      "name": "Animals",
      "words": ["Giraffe", "Platypus", "Elephant"]
    }
  ]
}
```

### Import validation

Validation must detect:

- Invalid JSON.
- Missing schema version.
- Unsupported future schema version.
- Missing category names.
- Empty or invalid words.
- Duplicate IDs.
- Duplicate words within a category.
- Excessive file size.
- Excessive category or word counts.
- Values with unsupported data types.

Import text must be treated as plain text and never rendered as HTML.

Recommended initial limits:

- Maximum file size: 5 MB.
- Maximum categories: 1,000.
- Maximum words per category: 10,000.
- Maximum word length: 200 characters.
- Maximum category-name length: 100 characters.

These are safety limits, not expected normal usage.

## FR-11: Offline support

The application shell, fonts, icons, and required assets should be cached by a service worker.

After an initial successful load, the user should be able to:

- Open the installed application.
- Browse categories.
- Edit content.
- Import a local JSON file.
- Play rounds.
- View results.

No network request should be required during gameplay.

## FR-12: Screen wake lock

During calibration and gameplay, the application should request a screen wake lock when supported.

It must:

- Release the lock after the round ends.
- Detect when the lock is released.
- Attempt to reacquire it when the document becomes active again.
- Continue functioning if the request fails.

The Screen Wake Lock API is intended to prevent the display from dimming or locking, but locks may be rejected or automatically released when the document is inactive, invisible, or affected by device conditions. ([MDN Web Docs][6])lscreen and landscape handling

The application may request fullscreen after the user taps **Start Round**, but fullscreen must be treated as optional because browser support is not universal. ([MDN Web Docs][7])on must remain usable when:

- Browser controls remain visible.
- Fullscreen is rejected.
- Orientation locking is unavailable.
- The user has rotation lock enabled.

The installed PWA manifest should request:

```json
{
  "display": "standalone",
  "orientation": "landscape"
}
```

CSS must still correctly handle portrait mode and display a clear **Rotate your phone** prompt rather than breaking the page.

## FR-14: Settings

Initial settings should include:

- Motion control on/off.
- Gesture sensitivity:

  - Low
  - Normal
  - High

- Invert correct/skip direction.
- Sound feedback on/off.
- Reduced-motion mode.
- Show touch controls during motion play.
- Keep screen awake on/off.
- Confirm before ending a round.
- Optional round-history retention.

Advanced settings may expose:

- Correct threshold.
- Skip threshold.
- Neutral-zone size.
- Dwell time.
- Cooldown duration.

Advanced values must have a reset-to-default action.

---

## 8. UX requirements

### 8.1 Mobile-first

All primary actions must be usable on a phone without zooming.

Minimum interaction requirements:

- Large touch targets.
- Safe-area support for notches and home indicators.
- No essential hover interactions.
- Clear focus states.
- Support for dynamic text sizing.
- High contrast.
- Long words scale or wrap without clipping.

### 8.2 Landscape gameplay

The gameplay screen should contain only essential information:

- Current word.
- Optional category name.
- Optional presented count.
- Sensor status.
- Secondary touch controls.
- End-round control.

Navigation bars and editing controls must not appear during active gameplay.

### 8.3 Feedback visibility

After a gesture:

- Show result feedback for approximately 400 ms.
- Do not immediately expose the next word before other players can perceive the classification.
- Optionally play a short original sound.
- Do not depend on vibration because platform support may differ.
- Advance automatically after feedback.

### 8.4 Error messages

Messages must describe:

- What happened.
- Whether gameplay can continue.
- What the user should do next.

Example:

> Motion access was not granted. You can continue using the Correct and Skip buttons, or enable motion access later in Settings.

---

## 9. Accessibility

The MVP must support:

- Screen-reader labels for all controls outside active forehead gameplay.
- Keyboard operation.
- Color-independent status indicators.
- Reduced-motion preference.
- Adjustable text.
- High-contrast presentation.
- Logical focus order.
- Unicode content.
- Bidirectional text.
- RTL-compatible layout foundations.

The word itself should be exposed as an accessible heading, although normal screen-reader gameplay is not a primary use case.

---

## 10. Recommended technical architecture

## 10.1 Frontend stack

Recommended stack:

- React.
- TypeScript with strict type checking.
- Vite.
- A PWA/service-worker integration.
- IndexedDB through a small storage abstraction.
- Runtime schema validation for imported JSON.
- Unit and component testing.
- Playwright for browser-level testing.

Exact library choices and versions should be documented in an architecture decision record rather than embedded permanently in this PRD.

## 10.2 Major modules

```text
src/
  app/
    routing/
    providers/
    startup/
  features/
    categories/
    gameplay/
    import-export/
    results/
    settings/
    onboarding/
  domain/
    category/
    round/
    gesture/
  sensors/
    DeviceOrientationAdapter.ts
    TouchControlAdapter.ts
    SimulatedSensorAdapter.ts
    OrientationNormalizer.ts
    GestureClassifier.ts
    SensorDiagnostics.ts
  persistence/
    CategoryRepository.ts
    IndexedDbCategoryRepository.ts
    SettingsRepository.ts
    migrations/
  pwa/
    wakeLock.ts
    install.ts
    serviceWorker.ts
  shared/
    components/
    validation/
    utilities/
```

## 10.3 Architectural boundaries

### Round engine

The round engine owns:

- Shuffling.
- Current word.
- Classification.
- Scoring.
- Ending a round.
- Results.

It must not read browser sensors directly.

### Sensor layer

The sensor layer owns:

- Permission.
- Raw event subscriptions.
- Screen-orientation normalization.
- Calibration.
- Filtering.
- Gesture classification.

It reports semantic actions to the round engine.

### Persistence layer

UI components must not access IndexedDB directly.

Repositories must support:

- CRUD.
- Transactions.
- Schema migrations.
- Import backups.
- Test implementations held in memory.

### Import layer

Import processing should follow:

```text
read file
→ parse JSON
→ validate schema
→ normalize
→ detect duplicates
→ preview
→ user chooses strategy
→ transactional write
→ report results
```

---

## 11. Agentic development workflow

## 11.1 Workflow principles

The implementation workflow must:

- Resolve the sensor risk before building most of the product.
- Divide work along stable module boundaries.
- Require evidence for completed requirements.
- Keep product decisions in a shared decision log.
- Avoid multiple agents editing the same files concurrently.
- Use small, reviewable pull requests.
- Require tests with each behavioral change.
- Treat real-device testing as a release gate.
- Preserve a runnable main branch.

## 11.2 Agent roles

### A. Orchestrator / Technical Lead Agent

Responsibilities:

- Read the PRD and open decisions.
- Create the implementation plan.
- Define dependency order.
- Assign non-overlapping tasks.
- Maintain architecture consistency.
- Review pull requests.
- Resolve conflicts.
- Track requirement coverage.
- Prevent unverified assumptions from entering the implementation.

Required artifacts:

- `docs/IMPLEMENTATION_PLAN.md`
- `docs/DECISIONS.md`
- `docs/REQUIREMENTS_TRACEABILITY.md`
- Issue/task graph
- Release readiness report

### B. Product and UX Agent

Responsibilities:

- Convert user flows into screen specifications.
- Produce low-fidelity wireframes.
- Define empty, loading, permission, error, and fallback states.
- Review wording and usability.
- Ensure the absence of a timer is reflected throughout the UI.
- Define the first-run tutorial.

Required artifacts:

- `docs/UX_FLOWS.md`
- `docs/SCREEN_SPECIFICATIONS.md`
- Wireframes or structured screen descriptions
- Copy catalogue

This agent should not implement sensor logic.

### C. Sensor Research Agent

This agent owns the highest-risk technical spike.

Responsibilities:

- Build a standalone sensor diagnostic page.
- Implement permission handling.
- Display raw and normalized readings.
- Implement neutral calibration.
- Determine the correct axis mapping for portrait and both landscape orientations.
- Prototype filtering and thresholds.
- Log gesture transitions.
- Test on real iPhone and Android hardware.
- Recommend default sensitivity profiles.

Required artifacts:

- `docs/SENSOR_SPEC.md`
- Diagnostic application or route
- Test logs
- Device/browser matrix
- Recommended thresholds
- Known limitations
- Short demonstration recordings where practical

This work must be approved before full gameplay integration.

### D. Domain and Data Agent

Responsibilities:

- Implement category, word, round, and result models.
- Implement deck shuffling and exhaustion.
- Implement scoring and result correction.
- Define JSON schemas.
- Implement validation and normalization.
- Implement merge, add, and replace strategies.
- Implement storage repositories and migrations.

Required tests:

- Unit tests for all domain behavior.
- Migration tests.
- Import validation tests.
- Duplicate-handling tests.
- Transaction rollback tests.

### E. Application UI Agent

Responsibilities:

- Implement home and category screens.
- Implement editor screens.
- Implement gameplay UI.
- Implement results.
- Implement settings.
- Integrate domain services.
- Meet responsive and accessibility requirements.

This agent consumes the sensor API but does not modify its internal classifier without coordination.

### F. PWA and Platform Agent

Responsibilities:

- Configure the manifest.
- Configure offline caching.
- Implement install guidance.
- Implement screen wake lock.
- Implement safe-area handling.
- Add capability detection.
- Verify direct browser and installed-PWA behavior.
- Configure static HTTPS deployment.

Required artifacts:

- PWA audit results.
- Offline test evidence.
- Installation instructions.
- Platform limitation notes.

### G. Test and Quality Agent

Responsibilities:

- Build the complete test strategy.
- Add automated browser scenarios.
- Add synthetic sensor injection.
- Run accessibility checks.
- Conduct exploratory testing.
- Coordinate physical-device tests.
- Verify every acceptance criterion.
- Report regressions with reproducible steps.

Required artifacts:

- `docs/TEST_PLAN.md`
- `docs/DEVICE_TEST_MATRIX.md`
- Automated test suite
- Final acceptance report

### H. Security and Release Reviewer Agent

Responsibilities:

- Review import handling.
- Check for unsafe HTML rendering.
- Review storage and privacy behavior.
- Check dependencies and build output.
- Verify no unwanted network calls occur.
- Verify original branding and assets.
- Confirm that production diagnostics do not record sensor traces unexpectedly.
- Approve release readiness.

---

## 11.3 Execution phases

### Phase 0: Product decisions and repository setup

Tasks:

1. Record answers to the open questions.
2. Finalize MVP scope.
3. Create repository and CI.
4. Add linting, formatting, strict type checking, and test commands.
5. Establish shared documentation.
6. Create requirement IDs and task mapping.

Exit gate:

- Open product decisions are either resolved or explicitly defaulted.
- CI passes on the application skeleton.
- Development and production builds run.

### Phase 1: Sensor feasibility spike

Tasks:

1. Create the sensor diagnostic page.
2. Implement permission flow.
3. Implement raw orientation display.
4. Implement orientation normalization.
5. Implement calibration.
6. Prototype gesture state machine.
7. Test in:

   - iPhone browser.
   - Installed iPhone web app.
   - Android Chrome.
   - Installed Android PWA.

8. Tune thresholds.
9. Document limitations.

Exit gate:

- Both correct and skip gestures work on at least one representative iPhone and one representative Android phone.
- No repeated trigger occurs while a phone remains tilted.
- Denied permission falls back cleanly.
- The technical lead approves the sensor interface.

The rest of the application must not be considered low risk until this gate passes.

### Phase 2: Domain, storage, and import/export

Tasks:

1. Implement category and word models.
2. Implement round engine.
3. Implement storage repository.
4. Implement schema migrations.
5. Implement JSON validation.
6. Implement import preview and strategies.
7. Implement export.
8. Add unit tests.

Exit gate:

- All domain and import tests pass.
- Data survives reload.
- Invalid imports cannot corrupt existing data.
- Replacement import creates a recoverable backup.

### Phase 3: Core UI

Tasks:

1. Home.
2. Category detail.
3. Category editor.
4. Settings.
5. Gameplay screen using simulated controls.
6. Results.
7. Responsive and accessibility review.

Exit gate:

- A complete round can be played using buttons and synthetic sensor events.
- A custom category can be created and played.
- JSON import/export works through the UI.

### Phase 4: Sensor integration

Tasks:

1. Connect the approved sensor adapter to gameplay.
2. Add calibration onboarding.
3. Add feedback states.
4. Add sensitivity settings.
5. Add fallback and recovery.
6. Add diagnostic mode hidden behind settings or a development flag.

Exit gate:

- Real-device gesture tests meet agreed accuracy.
- Permission denial does not block play.
- Orientation changes do not corrupt the round.
- One gesture produces exactly one classification.

### Phase 5: PWA and offline behavior

Tasks:

1. Add manifest.
2. Add service worker.
3. Add icons.
4. Add install guidance.
5. Add wake lock.
6. Add offline validation.
7. Deploy to HTTPS staging.

Exit gate:

- Application is installable where the platform permits.
- Gameplay works offline after initial load.
- Wake-lock failure does not break gameplay.
- No mandatory feature depends on fullscreen or orientation lock.

### Phase 6: Release validation

Tasks:

1. Run full automated suite.
2. Run physical-device test matrix.
3. Test long and RTL words.
4. Test malformed imports.
5. Test low-power and interrupted-session behavior.
6. Run accessibility checks.
7. Review privacy and network traffic.
8. Complete requirements traceability.

Exit gate:

- All critical and high-severity issues are resolved.
- Every MVP requirement is marked verified, deferred, or rejected with an explanation.
- Production deployment is reproducible.
- Rollback instructions exist.

---

## 12. Testing requirements

## 12.1 Unit tests

Required unit-test areas:

- Category validation.
- Word validation.
- Shuffle behavior.
- No repetition within a round.
- Deck exhaustion.
- Correct, skipped, and unclassified scoring.
- Result correction.
- Gesture thresholds.
- Gesture dwell time.
- Neutral rearming.
- Cooldown.
- Noise filtering.
- Orientation normalization.
- JSON normalization.
- Import conflict strategies.
- Schema migrations.

## 12.2 Component and integration tests

Required scenarios:

- Empty category.
- Permission granted.
- Permission denied.
- Permission API absent.
- Permission granted but no sensor events arrive.
- Calibration unstable.
- Correct gesture.
- Skip gesture.
- Sustained tilt.
- Rapid alternating gestures.
- End round.
- Import preview.
- Failed import.
- Merge import.
- Replace import.
- Storage write failure.
- Wake-lock rejection.
- Visibility change and wake-lock reacquisition.

## 12.3 End-to-end tests

Synthetic sensors must be injectable so automated tests can simulate calibrated orientation samples.

Mandatory E2E scenarios:

1. Create category and play it.
2. Import JSON and play imported category.
3. Correct gesture advances one word.
4. Skip gesture advances one word.
5. Sustained tilt does not advance repeatedly.
6. Manual fallback works.
7. End round and modify a result.
8. Reload and retain categories.
9. Start offline after prior successful load.
10. Replace import and recover previous data from backup.

## 12.4 Physical-device test protocol

For each supported device/browser combination:

1. Calibrate normally.
2. Perform 20 deliberate correct gestures.
3. Perform 20 deliberate skip gestures.
4. Alternate correct and skip 20 times.
5. Hold neutral for two minutes.
6. Walk slowly while holding the phone.
7. Leave the phone tilted for five seconds.
8. Return from background.
9. Rotate to the opposite landscape orientation.
10. Deny permission and verify fallback.
11. Test an installed home-screen version where available.
12. Test with screen rotation lock enabled.

Record:

- Correct recognitions.
- Incorrect classifications.
- Missed gestures.
- Duplicate triggers.
- False triggers.
- Approximate response latency.
- Browser and OS.
- Hardware model.
- Installed versus browser mode.

Minimum release matrix:

- At least two materially different iPhone models.
- At least two materially different Android models.
- Direct browser mode.
- Installed home-screen/PWA mode.

---

## 13. Observability and diagnostics

A development-only diagnostics view should show:

- Permission state.
- Browser capability detection.
- Screen orientation.
- Raw alpha, beta, and gamma.
- Calibrated baseline.
- Normalized pitch.
- Filtered pitch.
- Gesture state.
- Threshold crossings.
- Current sensitivity profile.
- Wake-lock state.
- Recent state transitions.

Production diagnostic export, if retained, must:

- Require an explicit user action.
- Contain no category or word content by default.
- Include only recent sensor and state data.
- Never upload data automatically.

---

## 14. Performance requirements

- Gameplay transitions should remain smooth on representative supported phones.
- Sensor handling must avoid unnecessary React rerenders.
- Raw samples should be processed outside visual component state where possible.
- Only meaningful diagnostic values should be rendered.
- Large imported decks must not freeze the UI for an extended period.
- The game shell should be lightweight enough for reliable mobile loading.
- No network operation may be placed in the gesture-to-next-word path.

---

## 15. Privacy and security requirements

- No account is required.
- No personal data is required.
- No sensor data is sent off-device.
- JSON files are processed locally.
- Imported text is rendered as text, never injected HTML.
- File type, size, and schema are validated.
- Replace operations require explicit confirmation.
- A pre-replacement backup is retained.
- Debug logs are disabled or minimized in production.
- The application must disclose local storage usage.
- Dependency review must occur before release.

---

## 16. Deployment

The MVP should deploy as a static HTTPS application.

Environments:

- Local development.
- Preview deployment per pull request.
- Staging.
- Production.

Required CI checks:

- Install.
- Type check.
- Lint.
- Unit tests.
- Production build.
- Browser tests.
- Dependency/security scan where available.

Production release should be immutable and rollback-capable.

---

## 17. Definition of done

A requirement is complete only when:

1. Implementation is merged.
2. Automated tests cover the main behavior.
3. Error and fallback states are implemented.
4. Product acceptance criteria are verified.
5. Documentation is updated.
6. The feature works in a production build.
7. Relevant real-device evidence exists.
8. Accessibility implications have been reviewed.
9. No unresolved critical defect remains.

Code generation alone does not satisfy completion.

---

## 18. Open product questions

The following answers are needed before converting this document to PRD v1.0. Defaults are shown in **bold**.

### Q1. Who will use the application?

- Private use by your family or friends.
- Small invited group.
- Publicly available application.

**Default: private/public-link application with no login.**

### Q2. How should a round end?

- Only when the player taps **End Round**.
- When every word has been shown.
- Either event.
- A special tilt or gesture should end it.

**Default: either manual End Round or deck exhaustion.**

### Q3. What should happen after every word in a category has been shown?

- End the round.
- Automatically reshuffle and continue.
- Ask whether to reshuffle.
- Continue but avoid recent repeats.

**Default: end and show Deck complete.**

### Q4. Are scores and teams needed?

Possible levels:

- Only show correct/skipped results for the current round.
- Keep local round history.
- Support named players.
- Support two or more teams and cumulative scores.
- Support multi-round matches.

**Default: current-round results only, with optional local history but no teams.**

### Q5. Which interface languages are required?

- English only.
- Hebrew only.
- English and Hebrew.
- Additional languages.

Should the entire interface support RTL, or only category and word content?

**Default: English interface with Unicode and RTL-compatible content.**

### Q6. Should categories synchronize between devices?

- No; use JSON export/import.
- Yes, through an optional cloud account.
- Yes, through a shared link or code.
- Yes, through iCloud/Google-specific storage.

**Default: local storage with JSON transfer only.**

### Q7. Should imported categories be editable?

**Default: yes, all imported content becomes normal editable local content.**

### Q8. Is a category password or administration mode needed?

This may be useful if children will play but should not change the decks.

**Default: no password or administrative lock.**

### Q9. What category metadata is desired?

Potential fields:

- Name.
- Description.
- Emoji/icon.
- Theme color.
- Difficulty.
- Age range.
- Language.
- Tags.

**Default: name, description, emoji, and color.**

### Q10. Should categories support phrases as well as single words?

Examples include people, movie titles, quotations, actions, or multi-line prompts.

**Default: any plain-text prompt up to 200 characters, including phrases.**

### Q11. Should skipped words return later in the same round?

- Never.
- Return after all unused words.
- Return after several other words.
- Configurable by category.

**Default: no repeat during the same round.**

### Q12. Is audio feedback desired?

- No sound.
- Simple correct/skip sounds.
- Spoken announcement.
- Configurable.

**Default: optional simple original sounds, disabled through Settings.**

### Q13. Should correct and skip directions be fixed?

The requested default is:

- Tilt down: correct.
- Tilt up: skip.

Should users be allowed to reverse them?

**Default: requested directions, with an invert setting.**

### Q14. What is the minimum device support target?

Possible policy:

- Recent devices and browser versions only.
- Older devices should work through touch controls.
- Specific known family phones must be supported.

Please provide the oldest iPhone and Android models that matter, if known.

**Default: motion support on recent devices; touch fallback on unsupported devices.**

### Q15. Should game history persist?

- No history after leaving the result screen.
- Keep the last several rounds.
- Keep all rounds locally.
- Include players and teams.

**Default: retain the most recent 20 rounds locally, with a clear-history action.**

### Q16. Should the application include starter categories?

- No, start empty.
- Include a small demonstration category.
- Include a complete starter library that you provide.
- Generate sample categories during development and replace them later.

**Default: one small demonstration category using original generic content.**

### Q17. Do you have deployment preferences?

Examples:

- Existing domain.
- GitHub Pages.
- Cloudflare Pages.
- Vercel.
- Another static host.

**Default: provider-neutral static HTTPS deployment.**

### Q18. Is installability and offline use a hard requirement?

**Default: yes.**

---

## 19. Defaults authorized for an autonomous MVP build

Unless changed by the product owner, the agentic workflow may proceed using these decisions:

- Build a React/TypeScript PWA.
- Use original TiltGuess branding.
- No backend or login.
- Local IndexedDB storage.
- JSON import/export.
- English UI with RTL-ready foundations.
- One selected category per round.
- Shuffled words with no repeat.
- No round timer.
- End manually or on deck exhaustion.
- Tilt down means correct.
- Tilt up means skip.
- Configurable gesture sensitivity and inversion.
- Touch controls always available.
- Correct/skipped summary with editable results.
- Optional sound.
- Keep the last 20 rounds.
- Work offline after first load.
- Do not rely on fullscreen or orientation locking.
- Complete the sensor feasibility gate before broader implementation.

Reply with the numbered answers to the open questions that differ from the stated defaults; unspecified items can remain as written.

[1]: https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent/requestPermission_static "DeviceOrientationEvent: requestPermission() static method - Web APIs | MDN"
[2]: https://www.youtube.com/watch?v=yruo5DhD-y4 "How to Play Heads Up! - YouTube"
[3]: https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios?utm_source=chatgpt.com "Turn a website into an app in Safari on iPhone"
[4]: https://developer.mozilla.org/en-US/docs/Web/API/ScreenOrientation/lock?utm_source=chatgpt.com "ScreenOrientation: lock() method - Web APIs | MDN"
[5]: https://www.w3.org/TR/orientation-event/ "Device Orientation and Motion"
[6]: https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API "Screen Wake Lock API - Web APIs | MDN"
[7]: https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullscreen?utm_source=chatgpt.com "Element: requestFullscreen() method - Web APIs | MDN"
