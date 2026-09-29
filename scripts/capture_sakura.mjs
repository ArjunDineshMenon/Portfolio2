import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";
import assert from "node:assert/strict";

const out = "artifacts/sakura/web";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--enable-webgl", "--ignore-gpu-blocklist"],
});
const errors = [],
  report = [];
try {
  for (const [name, viewport] of [
    ["desktop", { width: 1440, height: 960 }],
    ["mobile", { width: 390, height: 844 }],
  ]) {
    const page = await browser.newPage({
      viewport,
      reducedMotion: "no-preference",
    });
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.goto(
      `${process.env.PORTFOLIO_URL ?? "http://127.0.0.1:4173"}/?mode=3d`,
    );
    await page.waitForSelector('canvas[data-animation="rigged"]', {
      timeout: 60000,
    });
    for (const [p, label] of [
      [0.02, "opening"],
      [0.21, "portrait"],
      [0.33, "prepare"],
      [0.35, "dash"],
      [0.39, "sheathe"],
      [0.427, "burst"],
      [0.505, "about"],
      [0.706, "project"],
      [0.972, "bow"],
    ]) {
      await page.evaluate(
        (p) =>
          window.scrollTo({
            top: (document.documentElement.scrollHeight - innerHeight) * p,
            behavior: "instant",
          }),
        p,
      );
      await page.waitForFunction(
        (p) =>
          Math.abs(
            Number(
              document.querySelector(".percent")?.textContent?.replace("%", ""),
            ) -
              p * 100,
          ) < 1.1,
        p,
      );
      await page.waitForTimeout(450);
      const state = await page
        .locator("canvas")
        .evaluate((c) => ({ ...c.dataset }));
      const screenshot = await page.screenshot({
        path: `${out}/${name}-${label}.png`,
      });
      const stats = await sharp(screenshot)
        .extract({
          left: Math.floor(viewport.width * 0.2),
          top: Math.floor(viewport.height * 0.15),
          width: Math.floor(viewport.width * 0.6),
          height: Math.floor(viewport.height * 0.55),
        })
        .stats();
      assert.ok(
        stats.channels.slice(0, 3).some((c) => c.stdev > 15),
        "Canvas image must contain visible geometry",
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        "No horizontal overflow",
      );
      report.push({
        name,
        label,
        p,
        state,
        pixelDeviation: stats.channels[0].stdev,
      });
      if (label === "about") {
        await page.waitForTimeout(1100);
        const next = await page
          .locator("canvas")
          .evaluate((c) => ({ ...c.dataset }));
        assert.notEqual(
          state.clipTime,
          next.clipTime,
          "Reading gesture should keep animating",
        );
        assert.notEqual(
          state.environmentTime,
          next.environmentTime,
          "Future should keep moving",
        );
        await page.screenshot({ path: `${out}/${name}-about-moving.png` });
        const bounds = await page.locator(".cinema-primary").boundingBox();
        assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= viewport.width);
      }
      console.log(name, label, state.clip, state.scene);
    }
    await page.close();
  }
} finally {
  await browser.close();
  await writeFile(
    `${out}/report.json`,
    JSON.stringify({ errors, report }, null, 2),
  );
}
assert.deepEqual(errors, []);
