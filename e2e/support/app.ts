import { expect, type Locator, type Page, type TestInfo } from "@playwright/test";

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || "akari@example.com";
const TEST_USER_PASSWORD =
  process.env.TEST_USER_PASSWORD || process.env.TEST_USER_SECRET || "ci-login-token";

export async function login(page: Page) {
  await page.goto("/");
  const submitButton = page.locator('form button[type="submit"]');
  await page.getByLabel("メールアドレス").fill(TEST_USER_EMAIL);
  await page.getByLabel("パスワード").fill(TEST_USER_PASSWORD);
  await submitButton.click();
  await expect(page.getByRole("button", { name: "作品を検索してストックに追加" })).toBeVisible();
}

export async function openAddModal(page: Page) {
  await page.getByRole("button", { name: "作品を検索してストックに追加" }).click();
  await expect(page.getByRole("dialog", { name: "作品を追加" })).toBeVisible();
}

function getColumn(page: Page, status: string) {
  return page.locator(`[data-column-status="${status}"]`);
}

function getDropzone(page: Page, status: string) {
  return page.locator(`[data-dropzone-status="${status}"]`);
}

export function getCardInColumn(page: Page, status: string, title: string) {
  return getColumn(page, status)
    .locator("article")
    .filter({ has: page.getByText(title, { exact: true }) });
}

export async function addManualWork(page: Page, title: string) {
  await openAddModal(page);
  await page.getByLabel("タイトル").fill(title);
  await page.locator('button[type="submit"]').click();
  await expect(page.getByRole("dialog", { name: "作品を追加" })).not.toBeVisible();
  await expect(getCardInColumn(page, "stacked", title)).toBeVisible();
}

export async function closeDetailModal(page: Page, title: string) {
  const dialog = page.getByRole("dialog", { name: title });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("textbox")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
}

export async function deleteCard(page: Page, status: string, title: string) {
  const card = getCardInColumn(page, status, title);
  await expect(card).toBeVisible();
  await card.getByLabel("カードメニューを開く").click();
  await page.getByRole("menuitem", { name: "削除" }).click();
  await expect(card).toHaveCount(0);
}

export function buildUniqueTitle(testInfo: TestInfo, prefix = "e2e-manual") {
  const projectSlug = testInfo.project.name.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-");
  const testSlug = testInfo.title.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-");
  return `${prefix}-${projectSlug}-${testInfo.workerIndex}-${Date.now()}-${testSlug}`;
}

export async function dragCardToColumn(page: Page, sourceCard: Locator, targetStatus: string) {
  const sourceBox = await sourceCard.boundingBox();
  const targetBox = await getDropzone(page, targetStatus).boundingBox();

  if (!sourceBox || !targetBox) {
    throw new Error("drag target is not available");
  }

  const sourceX = sourceBox.x + sourceBox.width / 2;
  const sourceY = sourceBox.y + Math.min(sourceBox.height / 2, 48);
  const targetX = targetBox.x + targetBox.width / 2;
  const targetY = targetBox.y + Math.min(targetBox.height / 2, 180);

  await page.mouse.move(sourceX, sourceY);
  await page.mouse.down();
  await page.mouse.move(sourceX + 24, sourceY + 24, { steps: 6 });
  await page.mouse.move(targetX, targetY, { steps: 18 });
  await page.mouse.up();
}
