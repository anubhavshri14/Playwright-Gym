import { test, expect } from "@playwright/test"
test("Playwright Launch", async ({ page }) => {
    await page.goto("http://127.0.0.1:4174 ")
    await page.waitForTimeout(5000)
})