import { expect, test, type Page } from "@playwright/test";

// Synthetic sensor injection (PRD §12.3): the MotionController also listens
// for `uhu:sensor` CustomEvents. Pitch = asin(cosβ·cosγ):
//   β=90, γ=0  → pitch   0° (neutral, forehead position)
//   β=140,γ=0  → pitch −50° (tilt down → CORRECT)
//   β=40, γ=0  → pitch +50° (tilt up   → SKIP)
const NEUTRAL = 90;
const DOWN = 140;
const UP = 40;

/** Stream samples at 50Hz for `ms` milliseconds. */
function inject(page: Page, beta: number, ms: number): Promise<void> {
  return page.evaluate(
    ([b, duration]) =>
      new Promise<void>((resolve) => {
        const timer = setInterval(() => {
          window.dispatchEvent(
            new CustomEvent("uhu:sensor", { detail: { beta: b, gamma: 0 } }),
          );
        }, 20);
        setTimeout(() => {
          clearInterval(timer);
          resolve();
        }, duration);
      }),
    [beta, ms] as const,
  );
}

async function createAndStart(page: Page, words: string[]) {
  await page.goto("#/new");
  await page.getByLabel("Name").fill("Motion");
  await page
    .getByPlaceholder("Paste words — one per line")
    .fill(words.join("\n"));
  await page.getByRole("button", { name: "Add all" }).click();
  await page.getByRole("button", { name: "Save" }).click();
  await page.getByRole("link", { name: "Start round" }).click();
  await expect(page.getByText("Hold the phone to your forehead")).toBeVisible();
}

/** Feed a stable neutral stream through prepare + calibration until the word appears. */
async function calibrate(page: Page) {
  await inject(page, NEUTRAL, 6800);
  await expect(page.locator(".play-word")).toBeVisible({ timeout: 5000 });
}

test.beforeEach(async ({ page }) => {
  page.on("dialog", (dialog) => void dialog.accept());
});

test("correct and skip gestures each advance exactly one word (E2E-3, E2E-4)", async ({
  page,
}) => {
  await createAndStart(page, ["A", "B", "C", "D"]);
  await calibrate(page);
  await expect(page.getByText("1 shown")).toBeVisible();

  // tilt down → CORRECT
  await inject(page, DOWN, 400);
  await expect(page.locator(".flash-correct")).toBeVisible();
  await inject(page, NEUTRAL, 800); // rearm
  await expect(page.getByText("2 shown")).toBeVisible();

  // tilt up → SKIP
  await inject(page, UP, 400);
  await expect(page.locator(".flash-skip")).toBeVisible();
  await inject(page, NEUTRAL, 800);
  await expect(page.getByText("3 shown")).toBeVisible();
});

test("a sustained tilt classifies only once (E2E-5)", async ({ page }) => {
  await createAndStart(page, ["A", "B", "C", "D"]);
  await calibrate(page);

  // hold the phone tilted down for 3 seconds: exactly one CORRECT
  await inject(page, DOWN, 3000);
  await expect(page.getByText("2 shown")).toBeVisible();

  await inject(page, NEUTRAL, 800);
  await page.getByRole("button", { name: "End round" }).click();
  await expect(page).toHaveURL(/#\/results/);
  await expect(page.locator(".score-correct strong")).toHaveText("1");
  await expect(page.locator(".score-skip strong")).toHaveText("0");
});

test("unstable calibration offers retry and touch fallback", async ({
  page,
}) => {
  await createAndStart(page, ["A", "B"]);
  // wobble hard through prepare + the sampling window
  for (let i = 0; i < 50; i++) {
    await inject(page, i % 2 ? DOWN : UP, 130);
  }
  await expect(
    page.getByText("Calibration failed", { exact: false }),
  ).toBeVisible({
    timeout: 5000,
  });

  await page.getByRole("button", { name: "Use touch buttons" }).click();
  await expect(page.locator(".play-word")).toBeVisible({ timeout: 10_000 });
  await expect(
    page.getByText("Motion unavailable", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Correct" }).click();
  await expect(page.locator(".flash-correct")).toBeVisible();
});

test("invert setting swaps gesture directions", async ({ page }) => {
  await page.goto("#/settings");
  await page.getByLabel("Invert correct/skip direction").check();

  await createAndStart(page, ["A", "B", "C"]);
  await calibrate(page);
  await inject(page, DOWN, 400); // tilt down now means SKIP
  await expect(page.locator(".flash-skip")).toBeVisible();
});
