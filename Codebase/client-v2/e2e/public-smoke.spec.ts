import { expect, test } from "@playwright/test";

test("login and signup retain IUT-only content", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "IUTVerse" })).toBeVisible();
  await expect(page.getByText("Stay connected. Stay updated. Stay united.")).toBeVisible();
  await page.getByRole("link", { name: "Get started here" }).click();
  await expect(page.getByText("For IUT students only - Use your IUT email to get started!")).toBeVisible();
});
