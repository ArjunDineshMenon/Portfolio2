import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const out = "artifacts/cinematic/web";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ["--enable-webgl", "--ignore-gpu-blocklist"],
});
const errors = [];
for (const [name, viewport, samples] of [
  [
    "desktop",
    { width: 1440, height: 960 },
    [
      [0, "opening"],
      [0.13, "formation"],
      [0.18, "formed-face"],
      [0.22, "intro"],
      [0.3, "arrival"],
      [0.357, "slice"],
      [0.444, "portal"],
      [0.505, "about"],
      [0.488, "panel-strike"],
      [0.517, "panel-shatter"],
      [0.525, "travel"],
      [0.555, "direction"],
      [0.589, "cloud"],
      [0.645, "languages"],
      [0.706, "project"],
      [0.785, "cupola"],
      [0.815, "roadmap"],
      [0.87, "education"],
      [0.885, "credentials"],
      [0.929, "return"],
      [0.972, "bow"],
      [1, "contact"],
    ],
  ],
  [
    "mobile",
    { width: 390, height: 844 },
    [
      [0.22, "intro"],
      [0.357, "slice"],
      [0.505, "about"],
      [0.589, "cloud"],
      [0.706, "project"],
      [0.87, "education"],
      [0.885, "credentials"],
      [0.972, "bow"],
      [1, "contact"],
    ],
  ],
]) {
  const page = await browser.newPage({
    viewport,
    reducedMotion: "no-preference",
  });
  page.on("pageerror", (e) => {
    errors.push(e.message);
    console.error(e.message);
  });
  page.on("console", (m) => {
    if (m.type() === "error") {
      errors.push(m.text());
      console.error(m.text().slice(0, 900));
    }
  });
  await page.goto("http://127.0.0.1:5173/");
  await page.waitForSelector('canvas[data-animation="rigged"]', {
    timeout: 45000,
  });
  for (const [p, label] of samples) {
    if(process.argv.includes('--final')&&!['formed-face','intro','slice','panel-strike','panel-shatter','travel','about','bow','contact'].includes(label))continue;
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
    await page.evaluate(
      () =>
        new Promise((r) =>
          requestAnimationFrame(() =>
            requestAnimationFrame(() => requestAnimationFrame(r)),
          ),
        ),
    );
    await page.screenshot({ path: `${out}/${name}-${label}.png` });
    console.log(
      name,
      label,
      await page.locator("canvas").getAttribute("data-clip"),
    );
  }
  await page.close();
}
await writeFile(`${out}/console-errors.json`, JSON.stringify(errors, null, 2));
await browser.close();
if (errors.length) throw new Error(errors.join("\n"));
