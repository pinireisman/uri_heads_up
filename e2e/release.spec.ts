import { expect, test } from "@playwright/test";

// Phase 6 release checks: rendering edge cases, injection safety, privacy.

test.beforeEach(async ({ page }) => {
  page.on("dialog", (dialog) => void dialog.accept());
});

const importFile = (categories: unknown) => ({
  name: "import.json",
  mimeType: "application/json",
  buffer: Buffer.from(JSON.stringify({ schemaVersion: 1, categories })),
});

test("long and RTL words render without horizontal overflow", async ({
  page,
}) => {
  const longWord = "Antidisestablishmentarianism".repeat(7); // ~196 chars
  await page.goto("#/import-export");
  await page
    .locator('input[type="file"]')
    .setInputFiles(
      importFile([{ name: "Edge", words: [longWord, "בדיקה בעברית"] }]),
    );
  await page.getByRole("button", { name: "Add as new" }).click();

  await page.goto("#/");
  await page.getByRole("link", { name: /Edge/ }).click();
  await page.getByRole("link", { name: "Start round" }).click();
  await expect(page.locator(".play-word")).toBeVisible({ timeout: 10_000 });

  for (let i = 0; i < 2; i++) {
    await expect(page.locator(".play-word")).not.toBeEmpty();
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    await page.getByRole("button", { name: "Correct" }).click();
    await expect(page.locator(".flash-correct")).toBeHidden();
  }
});

test("imported text is rendered as text, never as HTML (§15)", async ({
  page,
}) => {
  const payload = `<img src=x onerror="document.title='pwned'">`;
  await page.goto("#/import-export");
  await page
    .locator('input[type="file"]')
    .setInputFiles(importFile([{ name: "Evil", words: [payload] }]));
  await page.getByRole("button", { name: "Add as new" }).click();

  await page.goto("#/");
  await page.getByRole("link", { name: /Evil/ }).click();
  await page.getByRole("link", { name: "Start round" }).click();
  await expect(page.locator(".play-word")).toBeVisible({ timeout: 10_000 });

  await expect(page.locator(".play-word")).toHaveText(payload); // literal text
  expect(await page.locator(".play-word img").count()).toBe(0);
  expect(await page.title()).toBe("UriHeadsUp");
});

test("no request leaves the origin during a full round (§15)", async ({
  page,
  baseURL,
}) => {
  const external: string[] = [];
  const origin = new URL(baseURL!).origin;
  page.on("request", (req) => {
    if (!req.url().startsWith(origin)) external.push(req.url());
  });

  await page.goto("#/");
  await page.getByRole("link", { name: /Animals/ }).click();
  await page.getByRole("link", { name: "Start round" }).click();
  await expect(page.locator(".play-word")).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "Correct" }).click();
  await expect(page.locator(".flash-correct")).toBeHidden();
  await page.getByRole("button", { name: "End round" }).click();
  await expect(page).toHaveURL(/#\/results/);

  expect(external).toEqual([]);
});
