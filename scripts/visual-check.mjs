#!/usr/bin/env node
/**
 * Visual / responsive check for every public route in ar, fr, en.
 *
 *   npm run build && npx next start -p 3005
 *   BASE_URL=http://localhost:3005 npm run check:visual
 *
 * Browser: Playwright's own Chromium (`npx playwright install chromium`), or any
 * installed Chromium-based browser via PW_CHROMIUM_PATH, e.g.
 *   PW_CHROMIUM_PATH="/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
 *
 * Fails (exit 1) on horizontal overflow, a header menu that doesn't close, or
 * a route that doesn't return 200. Screenshots go to ./screenshots/ (git-ignored).
 * Note: headless browsers launched with --window-size can't go below ~500px;
 * Playwright viewports can, which is why this script is the reference.
 */
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { chromium } from "@playwright/test";

const base = process.env.BASE_URL ?? "http://localhost:3005";
const locales = ["ar", "fr", "en"];
const routes = ["", "/events", "/academy", "/academy/maqamat/bayati", "/academy/studio", "/library", "/library/programs", "/library/programs/al-aqd-al-khalis", "/library/programs/al-aqd-al-khalis/follow", "/academy/maqamat", "/academy/any-course", "/login", "/login?mode=signup", "/join", "/forgot"];
const viewports = [
  { name: "360", width: 360, height: 780, mobile: true },
  { name: "390", width: 390, height: 844, mobile: true },
  { name: "768", width: 768, height: 1024, mobile: true },
  { name: "1440", width: 1440, height: 900, mobile: false },
];

const brave = "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
const executablePath = process.env.PW_CHROMIUM_PATH ?? (existsSync(brave) ? brave : undefined);
const shots = process.env.SCREENSHOTS !== "0";

await mkdir("screenshots", { recursive: true });
const browser = await chromium.launch(executablePath ? { executablePath } : {});
const failures = [];

for (const vp of viewports) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: vp.mobile,
    hasTouch: vp.mobile,
  });
  const page = await context.newPage();

  for (const l of locales) {
    for (const r of routes) {
      const url = `${base}/${l}${r}`;
      const res = await page.goto(url, { waitUntil: "networkidle" });
      if (!res || res.status() !== 200) failures.push(`${vp.name} ${url}: HTTP ${res?.status()}`);

      const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
      if (sw > iw) failures.push(`${vp.name} ${url}: horizontal overflow ${sw} > ${iw}`);

      if (shots) {
        const file = `screenshots/${vp.name}-${l}${r.replace(/[/?=]/g, "_") || "_home"}.png`;
        await page.screenshot({ path: file, fullPage: true });
      }
    }

    // Mobile menu: opens, closes with Escape (focus back on toggle), closes on outside tap.
    if (vp.width < 1024) {
      await page.goto(`${base}/${l}`, { waitUntil: "networkidle" });
      const details = page.locator("header details");
      await page.locator("header summary").click();
      if (!(await details.evaluate((d) => d.open))) failures.push(`${vp.name} /${l}: menu did not open`);
      await page.keyboard.press("Escape");
      if (await details.evaluate((d) => d.open)) failures.push(`${vp.name} /${l}: Escape did not close menu`);
      const focused = await page.evaluate(() => document.activeElement?.tagName);
      if (focused !== "SUMMARY") failures.push(`${vp.name} /${l}: focus not returned to menu button (${focused})`);
      await page.locator("header summary").click();
      await page.mouse.click(vp.width / 2, vp.height - 20);
      if (await details.evaluate((d) => d.open)) failures.push(`${vp.name} /${l}: outside tap did not close menu`);
    }
  }
  await context.close();
}

await browser.close();
if (failures.length) {
  console.error(`✗ ${failures.length} problem(s):\n` + failures.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}
console.log(`✓ ${viewports.length * locales.length * routes.length} page renders checked, no problems`);
