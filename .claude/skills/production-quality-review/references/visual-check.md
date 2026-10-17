# Visual check script

Headless Chrome/Brave with `--window-size` cannot render narrower than ~500 px, so phone screenshots taken that way are clipped and misleading. Use Playwright with a mobile viewport.

Until `@playwright/test` is a devDependency of this repo, a Playwright install elsewhere on the machine can be borrowed (as was done during development) — but the proper fix is:

```bash
npm i -D @playwright/test
npx playwright install chromium
```

`scripts/visual-check.mjs` (create when adopting):

```js
import { chromium } from "@playwright/test";

const base = process.env.BASE_URL ?? "http://localhost:3000";
const routes = ["/", "/events", "/academy", "/login", "/join"];
const locales = ["ar", "fr", "en"];
const viewports = [
  { name: "phone", width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: "desktop", width: 1440, height: 900 },
];

const browser = await chromium.launch();
for (const vp of viewports) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.isMobile, hasTouch: vp.hasTouch });
  for (const l of locales) for (const r of routes) {
    await page.goto(`${base}/${l}${r === "/" ? "" : r}`, { waitUntil: "networkidle" });
    const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
    if (sw > iw) console.error(`OVERFLOW ${vp.name} /${l}${r}: ${sw} > ${iw}`);
    await page.screenshot({ path: `screenshots/${vp.name}-${l}${r.replaceAll("/", "_") || "_home"}.png`, fullPage: true });
  }
  await page.close();
}
await browser.close();
```

Run against a production build (`npm run build && npx next start -p 3005`), not the dev server — the dev server can serve stale CSS after large stylesheet edits.
