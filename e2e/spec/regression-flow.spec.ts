import { expect, test } from "@playwright/test";
import {
  addManualWork,
  buildUniqueTitle,
  deleteCard,
  dragCardToColumn,
  getCardInColumn,
  login,
} from "../support/app.ts";

test("手動追加したカードを編集して列移動し、最後に削除できる", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "更新系の回帰は desktop chromium のみで固定する");

  const title = buildUniqueTitle(testInfo);
  const note = `${title} note`;

  await login(page);
  await addManualWork(page, title);

  const stackedCard = getCardInColumn(page, "stacked", title);
  await stackedCard.click();

  const detailModal = page.getByRole("dialog");
  await expect(detailModal).toBeVisible();

  await detailModal.getByRole("button", { name: "メモを追加" }).click();
  const textarea = detailModal.getByRole("textbox");
  await textarea.fill(note);
  await textarea.press("Control+Enter");

  await expect(detailModal.getByText(note)).toBeVisible();
  await detailModal.getByRole("button", { name: "Netflix" }).click();

  await page.keyboard.press("Escape");
  await expect(detailModal).not.toBeVisible();

  await page.reload();
  const reloadedStackedCard = getCardInColumn(page, "stacked", title);
  await expect(reloadedStackedCard).toBeVisible();
  await expect(reloadedStackedCard.getByText(note, { exact: true })).toBeVisible();

  await dragCardToColumn(page, reloadedStackedCard, "want_to_watch");
  await expect(getCardInColumn(page, "want_to_watch", title)).toBeVisible();
  await expect(getCardInColumn(page, "stacked", title)).toHaveCount(0);

  await page.reload();
  await expect(getCardInColumn(page, "want_to_watch", title)).toBeVisible();

  await deleteCard(page, "want_to_watch", title);
});

test("モバイルではタブ切り替えで別の列のカードを確認できる", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== "Mobile Chrome",
    "モバイル回帰は Mobile Chrome のみを対象にする",
  );

  await login(page);

  await page.getByRole("tab", { name: "視聴中" }).click();

  const watchingColumn = page.locator('[data-column-status="watching"]');
  await expect(watchingColumn.getByText(/ブレイキング・バッド/)).toBeVisible();
  await expect(page.getByRole("tab", { name: "視聴中", selected: true })).toBeVisible();
});
