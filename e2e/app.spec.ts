import { expect, test, type Page } from "@playwright/test";

// Each test gets a fresh browser context → fresh IndexedDB with demo seed.

test.beforeEach(async ({ page }) => {
  page.on("dialog", (dialog) => void dialog.accept());
});

async function createCategory(page: Page, name: string, words: string[]) {
  await page.goto("#/new");
  await page.getByLabel("Name").fill(name);
  await page
    .getByPlaceholder("Paste words — one per line")
    .fill(words.join("\n"));
  await page.getByRole("button", { name: "Add all" }).click();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
}

async function startRound(page: Page) {
  await page.getByRole("link", { name: "Start round" }).click();
  // 3s countdown, then the first word appears
  await expect(page.locator(".play-word")).toBeVisible({ timeout: 10_000 });
}

const importFile = (categories: unknown) => ({
  name: "import.json",
  mimeType: "application/json",
  buffer: Buffer.from(JSON.stringify({ schemaVersion: 1, categories })),
});

test("create a category and play it with touch controls (E2E-1, E2E-6)", async ({
  page,
}) => {
  await createCategory(page, "Party", ["Alpha", "Beta", "Gamma"]);
  await startRound(page);

  await page.getByRole("button", { name: "Correct" }).click();
  await expect(page.locator(".flash-correct")).toBeVisible();
  await expect(page.locator(".flash-correct")).toBeHidden();

  await page.getByRole("button", { name: "Skip" }).click();
  await expect(page.locator(".flash-skip")).toBeVisible();
  await expect(page.locator(".flash-skip")).toBeHidden();

  // keyboard fallback (FR-7): third word via ArrowDown → deck completes
  await page.keyboard.press("ArrowDown");
  await expect(page).toHaveURL(/#\/results/, { timeout: 10_000 });
  await expect(page.getByText("3 words shown")).toBeVisible();
  await expect(page.locator(".score-correct strong")).toHaveText("2");
  await expect(page.locator(".score-skip strong")).toHaveText("1");
});

test("import JSON and play the imported category (E2E-2)", async ({ page }) => {
  await page.goto("#/import-export");
  await page
    .locator('input[type="file"]')
    .setInputFiles(importFile([{ name: "Imported", words: ["One", "Two"] }]));
  await expect(page.getByText("1 categories, 2 words")).toBeVisible();
  await page.getByRole("button", { name: "Add as new" }).click();
  await expect(page.getByText("Imported: 1 added")).toBeVisible();

  await page.goto("#/");
  await page.getByRole("link", { name: /Imported/ }).click();
  await startRound(page);
  await page.getByRole("button", { name: "Correct" }).click();
  await expect(page.locator(".flash-correct")).toBeVisible();
});

test("end a round early and fix a result in review mode (E2E-7)", async ({
  page,
}) => {
  await createCategory(page, "Review", ["One", "Two", "Three"]);
  await startRound(page);
  await page.getByRole("button", { name: "Correct" }).click();
  await expect(page.locator(".flash-correct")).toBeHidden();
  await page.getByRole("button", { name: "End round" }).click(); // confirm auto-accepted

  await expect(page).toHaveURL(/#\/results/);
  // one correct + one unclassified (the word on screen when ending)
  await expect(
    page.getByRole("heading", { name: "Not classified" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mark correct" }).first().click();
  await expect(page.locator(".score-correct strong")).toHaveText("2");
});

test("categories survive a reload (E2E-8)", async ({ page }) => {
  await createCategory(page, "Persistent", ["Word"]);
  await page.goto("#/");
  await page.reload();
  await expect(page.getByRole("link", { name: /Persistent/ })).toBeVisible();
});

test("replace import backs up and restores previous data (E2E-10)", async ({
  page,
}) => {
  await page.goto("#/");
  await expect(page.getByRole("link", { name: /Animals/ })).toBeVisible(); // demo seed

  await page.goto("#/import-export");
  await page
    .locator('input[type="file"]')
    .setInputFiles(importFile([{ name: "Takeover", words: ["Only"] }]));
  await page.getByRole("button", { name: "Replace all" }).click(); // confirm auto-accepted
  await expect(page.getByText(/Imported:/)).toBeVisible();

  await page.goto("#/");
  await expect(page.getByRole("link", { name: /Takeover/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Animals/ })).toBeHidden();

  await page.goto("#/import-export");
  await page.getByRole("button", { name: "Restore last backup" }).click();
  await expect(page.getByText("Backup restored.")).toBeVisible();
  await page.goto("#/");
  await expect(page.getByRole("link", { name: /Animals/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Takeover/ })).toBeHidden();
});

test("invalid import is rejected without touching existing data", async ({
  page,
}) => {
  await page.goto("#/import-export");
  await page.locator('input[type="file"]').setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from("{ not json"),
  });
  await expect(page.getByText("That file is not valid JSON.")).toBeVisible();
  await page.goto("#/");
  await expect(page.getByRole("link", { name: /Animals/ })).toBeVisible();
});

test("Hebrew UI switches direction (RTL)", async ({ page }) => {
  await page.goto("#/");
  await page.getByRole("button", { name: "עברית" }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("link", { name: /קטגוריה חדשה/ })).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl"); // persisted
});

test("works offline after the first successful load (E2E-9)", async ({
  page,
  context,
}) => {
  await page.goto("");
  await expect(page.getByRole("link", { name: /Animals/ })).toBeVisible();
  // service worker active ⇒ precache complete
  await page.evaluate(() => navigator.serviceWorker.ready);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("link", { name: /Animals/ })).toBeVisible();

  // full round offline, via touch
  await page.getByRole("link", { name: /Animals/ }).click();
  await page.getByRole("link", { name: "Start round" }).click();
  await expect(page.locator(".play-word")).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "Correct" }).click();
  await page.getByRole("button", { name: "End round" }).click();
  await expect(page).toHaveURL(/#\/results/);
});

test("dark mode setting pins the color scheme and persists", async ({
  page,
}) => {
  await page.goto("#/settings");
  await page.getByLabel("Appearance").selectOption("dark");
  await expect(page.locator("html")).toHaveCSS("color-scheme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveCSS("color-scheme", "dark");
});

test("words-per-round setting limits the deck", async ({ page }) => {
  await page.goto("#/settings");
  await page.getByLabel("Words per round").selectOption("5");

  await page.goto("#/new");
  await page.getByLabel("Name").fill("Limited");
  await page
    .getByPlaceholder("Paste words — one per line")
    .fill(["A", "B", "C", "D", "E", "F", "G", "H"].join("\n"));
  await page.getByRole("button", { name: "Add all" }).click();
  await page.getByRole("button", { name: "Save" }).click();
  await page.getByRole("link", { name: "Start round" }).click();
  await expect(page.locator(".play-word")).toBeVisible({ timeout: 10_000 });

  for (let i = 0; i < 5; i++) {
    await page.getByRole("button", { name: "Correct" }).click();
    await expect(page.locator(".flash-correct")).toBeHidden();
  }
  await expect(page).toHaveURL(/#\/results/, { timeout: 10_000 });
  await expect(page.getByText("5 words shown")).toBeVisible();
});

test("fullscreen button toggles fullscreen", async ({ page }) => {
  await page.goto("#/");
  await page.getByRole("button", { name: "Full screen" }).click();
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(true);
  await page.getByRole("button", { name: "Exit full screen" }).click();
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(false);
});
