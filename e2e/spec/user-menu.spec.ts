import { expect, test } from "@playwright/test";

test("ユーザーメニューからログアウトできる", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: /akari@example.com/i }).click();
  await page.getByRole("menuitem", { name: "ログアウト" }).click();

  await expect(page.getByLabel("メールアドレス")).toBeVisible();
  await expect(page.getByLabel("パスワード")).toBeVisible();
  await expect(page.getByRole("button", { name: "作品を検索してストックに追加" })).toHaveCount(0);
});
