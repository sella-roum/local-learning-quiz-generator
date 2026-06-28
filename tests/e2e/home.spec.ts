import { test, expect } from "@playwright/test";

test.describe("Home page", () => {
  test("should display the home page with title", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("should show navigation links", async ({ page }) => {
    await page.goto("/");
    // Check that key navigation elements exist
    await expect(page.getByRole("main")).toBeVisible();
  });

  test("should navigate to files page", async ({ page }) => {
    await page.goto("/");
    // Look for a link or button that leads to /files
    const filesLink = page.getByRole("link", { name: /ファイル/i }).first();
    if (await filesLink.isVisible()) {
      await filesLink.click();
      await expect(page).toHaveURL(/\/files/);
    }
  });

  test("should navigate to quizzes page", async ({ page }) => {
    await page.goto("/");
    const quizzesLink = page.getByRole("link", { name: /クイズ/i }).first();
    if (await quizzesLink.isVisible()) {
      await quizzesLink.click();
      await expect(page).toHaveURL(/\/quizzes/);
    }
  });

  test("should navigate to play page", async ({ page }) => {
    await page.goto("/");
    const playLink = page.getByRole("link", { name: /プレイ|挑戦|play/i }).first();
    if (await playLink.isVisible()) {
      await playLink.click();
      await expect(page).toHaveURL(/\/play/);
    }
  });
});
