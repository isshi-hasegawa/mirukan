import { expect, test } from "@playwright/test";

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || "akari@example.com";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("ユーザーメニューからログアウトできる", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: new RegExp(escapeRegExp(TEST_USER_EMAIL), "i") }).click();
  await page.getByRole("menuitem", { name: "ログアウト" }).click();

  await expect(page.getByLabel("メールアドレス")).toBeVisible();
  await expect(page.getByLabel("パスワード")).toBeVisible();
  await expect(page.getByRole("button", { name: "作品を検索してストックに追加" })).toHaveCount(0);
});
