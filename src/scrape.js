import { chromium, devices } from "playwright";
import fs from "fs/promises";
import path from "path";
import { slugify, nowIso, chunk } from "../utils/helpers.js";

const MOBILE = devices["Pixel 5"];

export async function scrapeTargets(targets = [], opts = {}) {
  const headless = String(process.env.HEADLESS || "true") === "true";
  const blockMedia = String(process.env.BLOCK_MEDIA || "true") === "true";

  const browser = await chromium.launch({ headless });
  const results = [];
  const errors = [];

  const batches = chunk(targets, 3);
  for (const batch of batches) {
    const batchPromises = batch.map(async (t) => {
      const device = (t.device || "desktop").toLowerCase();
      const context = await browser.newContext(device === "mobile" ? { ...MOBILE } : {});
      const page = await context.newPage();

      if (blockMedia) {
        await page.route("**/*", (route) => {
          const type = route.request().resourceType();
          if (["image", "font", "media"].includes(type)) return route.abort();
          route.continue();
        });
      }

      // UA بسيط أقرب لواقع المستخدم
      await page.setUserAgent(
        device === "mobile"
          ? "Mozilla/5.0 (Linux; Android 12; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Mobile Safari"
          : "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari"
      );

      const startedAt = nowIso();
      try {
        await page.goto(t.url, { waitUntil: "domcontentloaded", timeout: 60000 });
        await page.waitForLoadState("networkidle", { timeout: 30000 });

        const out = { url: t.url, device, startedAt, finishedAt: null, ok: true };

        // استخراج الحقول المطلوبة
        out.title = await safeText(page, t.selectors?.title);
        out.price = await safeText(page, t.selectors?.price);
        out.availability = await safeText(page, t.selectors?.availability);
        out.currency = await safeText(page, t.selectors?.currency);
        out.extra = {};

        if (opts?.screenshots) {
          const dir = path.join(process.cwd(), "sample_output");
          await fs.mkdir(dir, { recursive: true });
          const fileName = `${slugify(t.url)}-${device}.png`;
          const full = path.join(dir, fileName);
          await page.screenshot({ path: full, fullPage: true });
          out.screenshot = fileName;
        }

        out.finishedAt = nowIso();
        results.push(out);
        await context.close();
      } catch (err) {
        errors.push({ url: t.url, device, startedAt, error: String(err) });
        await context.close();
      }
    });

    await Promise.allSettled(batchPromises);
  }

  await browser.close();
  return { results, errors };
}

async function safeText(page, selector) {
  if (!selector) return null;
  try {
    const loc = page.locator(selector).first();
    const count = await loc.count();
    if (count === 0) return null;
    const txt = await loc.innerText({ timeout: 5000 });
    return (txt || "").trim().replace(/\s+/g, " ");
  } catch {
    return null;
  }
}
