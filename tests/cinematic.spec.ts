import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { INFO_SHOTS } from "../src/director";

async function sample(page: Page, p: number) {
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
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
}
for (const viewport of [
  { width: 1440, height: 960 },
  { width: 390, height: 844 },
])
  test(`${viewport.width}: cinematic stations, steady reading, accessible copy, reverse travel`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.goto("/");
    await expect(page.locator("canvas")).toHaveAttribute(
      "data-animation",
      "rigged",
      { timeout: 45000 },
    );
    const poses: string[] = [];
    for (const [i, s] of INFO_SHOTS.entries()) {
      await sample(page, s.start + (s.end - s.start) * 0.68);
      const surface = page.locator(".cinema-surface");
      await expect(surface).toHaveAttribute("data-shot", s.id);
      await expect(surface).toHaveAttribute("aria-hidden", "false");
      await expect(surface).toHaveCSS("opacity", "1");
      const bounds = await page.locator(".cinema-primary").boundingBox();
      expect(bounds!.x).toBeGreaterThan(5);
      expect(bounds!.x + bounds!.width).toBeLessThan(viewport.width - 5);
      expect(bounds!.y).toBeGreaterThan(80);
      expect(bounds!.y + bounds!.height).toBeLessThan(viewport.height - 52);
      poses.push((await page.locator("canvas").getAttribute("data-actor"))!);
      if ([0, 2, 6, 9, 12, 13].includes(i))
        await page.screenshot({
          path: `test-results/station-${viewport.width}-${s.id}.png`,
        });
      if (i === 0) {
        await sample(page, s.start + (s.end - s.start) * 0.78);
        const held = await page.locator(".cinema-primary").boundingBox();
        expect(Math.abs(held!.y - bounds!.y)).toBeLessThan(0.3);
        expect(Math.abs(held!.x - bounds!.x)).toBeLessThan(0.3);
        await page.locator(".cinema-primary").focus();
        await expect(page.locator(".cinema-primary")).toBeFocused();
      }
    }
    expect(new Set(poses).size).toBe(14);
    await expect(page.locator(".cinema-primary")).toContainText(
      "None claimed as earned",
    );
    for (const index of [9, 6, 2, 0]) {
      const s = INFO_SHOTS[index];
      await sample(page, s.start + (s.end - s.start) * 0.68);
      await expect(page.locator("canvas")).toHaveAttribute(
        "data-actor",
        poses[index],
      );
    }
    const audit = await new AxeBuilder({ page }).analyze();
    expect(audit.violations).toEqual([]);
    await sample(page, 0.488);
    await expect(page.locator("canvas")).toHaveAttribute(
      "data-clip",
      "Panel_Slash_Left",
    );
    await expect(page.locator(".cinema-surface")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    await page.screenshot({
      path: `test-results/panel-strike-${viewport.width}.png`,
    });
    await sample(page, 0.517);
    await expect(page.locator("canvas")).toHaveAttribute(
      "data-clip",
      "Panel_Slash_Right",
    );
    await page.screenshot({
      path: `test-results/panel-shatter-${viewport.width}.png`,
    });
    await sample(page, 0.525);
    await expect(page.locator("canvas")).toHaveAttribute(
      "data-clip",
      "Walk_Travel_Loop",
    );
    await page.screenshot({
      path: `test-results/travel-${viewport.width}.png`,
    });
    expect(errors).toEqual([]);
  });

test("portrait tablet and landscape phone keep panels inside the viewport", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("/");
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-animation",
    "rigged",
    { timeout: 45000 },
  );
  for (const viewport of [
    { width: 800, height: 900 },
    { width: 844, height: 390 },
    { width: 320, height: 568 },
  ]) {
    await page.setViewportSize(viewport);
    for (const p of [0.505, 0.706, 0.885]) {
      await sample(page, p);
      const panel = page.locator(".cinema-primary");
      const bounds = await panel.boundingBox();
      expect(bounds!.x).toBeGreaterThan(5);
      expect(bounds!.x + bounds!.width).toBeLessThan(viewport.width - 5);
      expect(bounds!.y).toBeGreaterThan(75);
      expect(bounds!.y + bounds!.height).toBeLessThan(viewport.height - 50);
    }
    await page.screenshot({
      path: `test-results/compact-${viewport.width}.png`,
    });
  }
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.getByRole("link", { name: "Work", exact: true }).click();
  await expect(page.locator(".cinema-surface")).toHaveAttribute(
    "data-shot",
    "project-s3",
  );
  await expect(page.locator(".cinema-primary")).toBeFocused({timeout:15000});
  expect(errors).toEqual([]);
});
