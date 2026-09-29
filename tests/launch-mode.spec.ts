import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.use({ reducedMotion: "reduce", viewport: { width: 1440, height: 960 } });

async function verifySamurai(
  page: import("@playwright/test").Page,
  label: string,
) {
  await expect(page.locator(".app")).toHaveClass(/is-cinematic/);
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-animation",
    "rigged",
    { timeout: 45000 },
  );
  await page.evaluate(() =>
    window.scrollTo({
      top: (document.documentElement.scrollHeight - innerHeight) * 0.3,
      behavior: "instant",
    }),
  );
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-clip",
    "Draw_Katana",
  );
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  await page.screenshot({
    path: `artifacts/cinematic/web/launch-${label}-samurai.png`,
  });
  await page.evaluate(() =>
    window.scrollTo({
      top: (document.documentElement.scrollHeight - innerHeight) * 0.505,
      behavior: "instant",
    }),
  );
  await expect(page.locator("canvas")).toHaveAttribute("data-scene", "scifi");
  await expect(page.locator(".cinema-surface")).toHaveAttribute(
    "data-shot",
    "about-story",
  );
  await expect(page.locator(".cinema-surface")).toHaveAttribute(
    "aria-hidden",
    "false",
  );
  await page.screenshot({
    path: `artifacts/cinematic/web/launch-${label}-scifi.png`,
  });
}

test("reduced-motion users can explicitly play the real animated samurai and return to reading", async ({
  page,
}) => {
  const errors: string[] = [];
  const models: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("request", (r) => {
    if (r.url().endsWith(".glb")) models.push(r.url());
  });
  await page.goto("/");
  await expect(page.locator(".app")).toHaveClass(/is-reading/);
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(page.locator("#motion-notice")).toBeVisible();
  expect(models).toEqual([]);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  const play = page.getByRole("button", { name: "Play 3D experience" });
  await expect(play).toBeEnabled();
  await play.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/mode=3d/);
  await verifySamurai(page, "button");
  expect(models.some((url) => url.endsWith("samurai-cinematic.glb"))).toBe(
    true,
  );
  await page
    .getByRole("button", { name: "Read portfolio", exact: true })
    .click();
  await expect(page.locator(".app")).toHaveClass(/is-reading/);
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(page).toHaveURL(/mode=read/);
  await page.reload();
  await expect(page.locator(".app")).toHaveClass(/is-reading/);
  expect(errors).toEqual([]);
});

test("the direct 3D launch link loads the animated model with reduced motion enabled", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("/?mode=3d");
  await verifySamurai(page, "direct");
  expect(errors).toEqual([]);
});
