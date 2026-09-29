import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("desktop cinematic journey, reversal, links, download, and accessible reading", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  const errors: string[] = [];
  page.on("pageerror", (error) => {
    errors.push(error.message);
    console.error(error.message);
  });
  await page.goto("/");
  await expect(page.locator(".loader")).toHaveCount(0);
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.locator(".app")).toHaveClass(/scene-ready/);
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-animation",
    "rigged",
    { timeout: 30000 },
  );
  await page.screenshot({ path: "test-results/desktop-opening.png" });
  const sample = async (progress: number) => {
    await page.evaluate(
      (p) =>
        window.scrollTo({
          top: (document.documentElement.scrollHeight - innerHeight) * p,
          behavior: "instant",
        }),
      progress,
    );
    await expect
      .poll(async () =>
        Math.abs(
          Number(
            (await page.locator(".percent").textContent())?.replace("%", ""),
          ) -
            progress * 100,
        ),
      )
      .toBeLessThan(1.1);
    // Wait for a rendered WebGL frame, independently of scroll and DOM updates.
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
  };
  for (const [p, name] of [
    [0.2, "portrait"],
    [0.29, "samurai"],
    [0.35, "slice"],
    [0.365, "slice-impact"],
    [0.44, "portal"],
    [0.505, "about"],
    [0.615, "skills"],
    [0.71, "projects"],
    [0.815, "roadmap"],
    [0.971, "closing"],
    [1, "contact"],
  ] as const) {
    await sample(p);
    await page.screenshot({ path: `test-results/desktop-${name}.png` });
  }
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download Resume" }).click();
  expect((await downloadEvent).suggestedFilename()).toBe(
    "Arjun-Dinesh-Menon-Resume.docx",
  );
  await sample(0.2);
  await expect(page.locator(".movie-intro")).toHaveCSS("opacity", "1");
  await expect(page.locator(".world")).toHaveCSS("--scifi", "0");
  await sample(0.7);
  await expect(page.locator(".world")).toHaveCSS("--scifi", "1");
  await page.getByRole("button", { name: "Read portfolio" }).click();
  await expect(page.locator(".app")).toHaveClass(/is-reading/);
  await expect(page.locator("canvas")).toHaveCount(0);
  await page.getByRole("link", { name: "Path", exact: true }).click();
  await page
    .getByText("Education & certification targets", { exact: false })
    .click();
  await expect(page.getByText("Target: August 2026")).toBeVisible();
  const audit = await new AxeBuilder({ page }).analyze();
  expect(audit.violations).toEqual([]);
  expect(errors).toEqual([]);
});

test("mobile cinematic layout, menu keyboard behavior, and reduced motion", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".loader")).toHaveCount(0);
  await expect(page.locator(".app")).toHaveClass(/scene-ready/);
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-animation",
    "rigged",
    { timeout: 30000 },
  );
  await page.screenshot({ path: "test-results/mobile-opening.png" });
  await page.getByRole("button", { name: "Menu" }).click();
  await expect(page.getByRole("navigation")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Menu" })).toBeFocused();
  for (const [p, name] of [
    [0.2, "portrait"],
    [0.365, "slice-impact"],
    [0.505, "about"],
    [0.59, "skills"],
    [0.7, "projects"],
    [0.815, "roadmap"],
    [0.971, "closing"],
    [1, "contact"],
  ] as const) {
    await page.evaluate(
      (p) =>
        window.scrollTo({
          top: (document.documentElement.scrollHeight - innerHeight) * p,
          behavior: "instant",
        }),
      p,
    );
    await expect
      .poll(async () =>
        Math.abs(
          Number(
            (await page.locator(".percent").textContent())?.replace("%", ""),
          ) -
            p * 100,
        ),
      )
      .toBeLessThan(1.1);
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    await page.screenshot({ path: `test-results/mobile-${name}.png` });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".app")).toHaveClass(/is-reading/);
  await expect(page.locator("canvas")).toHaveCount(0);
  await page.screenshot({
    path: "test-results/mobile-reading.png",
    fullPage: true,
  });
  const audit = await new AxeBuilder({ page }).analyze();
  expect(audit.violations).toEqual([]);
});

test("context loss preserves portfolio; no invented project destinations", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.locator(".app")).toHaveClass(/scene-ready/);
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  await page
    .locator("canvas")
    .evaluate((canvas) =>
      canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true })),
    );
  await expect(page.locator(".app")).toHaveClass(/is-reading/);
  await expect(page.getByRole("status")).toContainText("3D is unavailable");
  await expect(page.locator(".project-card a")).toHaveCount(0);
  await expect(page.locator('#contact a[href^="mailto:"]')).toHaveAttribute(
    "href",
    "mailto:arjundineshmenon1@gmail.com",
  );
});

test("initial reduced motion skips 3D downloads and fits a narrow phone", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const models: string[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith(".glb")) models.push(request.url());
  });
  await page.goto("/");
  await expect(page.locator(".app")).toHaveClass(/is-reading/);
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Arjun Dinesh Menon — Aspiring Cloud & DevOps Engineer",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "test-results/narrow-reading.png" });
  expect(models).toEqual([]);
});

test("WebGL unavailable at startup falls back to HTML", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      kind: string,
      ...args: unknown[]
    ) {
      if (kind.includes("webgl")) return null;
      return Reflect.apply(original, this, [kind, ...args]);
    } as typeof original;
  });
  await page.goto("/");
  await expect(page.locator(".app")).toHaveClass(/is-reading/);
  await expect(page.locator("#projects")).toContainText("Cupola Furnace");
  await expect(page.getByRole("status")).toContainText("3D is unavailable");
});

test("failed character download preserves the full portfolio in reading view", async ({
  page,
}) => {
  await page.route("**/samurai-cinematic.glb", (route) => route.abort());
  await page.goto("/");
  await expect(page.locator(".app")).toHaveClass(/is-reading/, {
    timeout: 30000,
  });
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText("3D is unavailable");
  await expect(page.locator("#about")).toBeVisible();
});
