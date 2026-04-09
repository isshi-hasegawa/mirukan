import { chromium } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || "akari@example.com";
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || "password123";
const AUTH_FILE = path.resolve("e2e/.auth/user.json");

export default async function globalSetup() {
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL: "http://localhost:5173" });
  const page = await context.newPage();

  await page.goto("/");
  await page.getByLabel("メールアドレス").fill(TEST_USER_EMAIL);
  await page.getByLabel("パスワード").fill(TEST_USER_PASSWORD);
  await page.locator('form button[type="submit"]').click();
  await page.getByRole("button", { name: "作品を検索してストックに追加" }).waitFor();

  await context.storageState({ path: AUTH_FILE });
  await browser.close();
}
