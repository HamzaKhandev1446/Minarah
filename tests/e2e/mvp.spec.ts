import { test, expect } from "@playwright/test";

test("sample poster leads through a stable QR route without following automatically", async ({
  page,
}) => {
  await page.goto("/demo/qr/sample-cedar");
  await expect(
    page.getByRole("heading", { name: "Cedar Community Mosque" }),
  ).toBeVisible();
  await expect(
    page.getByText("This poster is a sample.", { exact: false }),
  ).toBeVisible();
  const href = await page.locator(".qr-url a").getAttribute("href");
  const target = new URL(href!);
  expect(target.pathname).toMatch(/^\/q\/[A-Za-z0-9_-]{22}$/);
  await page.screenshot({
    path: test.info().outputPath("qr-poster.png"),
    fullPage: true,
  });
  await page.goto(target.pathname + target.search);
  await expect(page).toHaveURL(/source=qr_sticker&mode=demo/);
  await expect(
    page.getByText("Check the mosque name below", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Follow Mosque", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
  await page
    .getByRole("button", { name: "Follow Mosque", exact: true })
    .click();
  await expect(page.getByRole("button", { name: /Unfollow/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("invalid QR codes offer recovery and protected routes require sign-in", async ({
  page,
}) => {
  await page.goto("/q/invalid?mode=demo");
  await expect(
    page.getByRole("heading", { name: "QR code not found" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Find a mosque" }),
  ).toHaveAttribute("href", "/?mode=demo");
  for (const route of [
    "/admin",
    "/platform",
    "/admin/00000000-0000-4000-8000-000000000001/qr",
  ]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  }
});

test("PWA caches only static fallback assets and shows no schedules offline", async ({
  page,
  context,
}) => {
  await page.goto("/?mode=demo");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);
  const manifest = await (
    await page.request.get("/manifest.webmanifest")
  ).json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.icons).toHaveLength(3);
  await page.goto("/auth/login");
  const cached = await page.evaluate(async () => {
    const names = await caches.keys();
    return (
      await Promise.all(
        names.map(async (name) =>
          (await (await caches.open(name)).keys()).map(
            (request) => new URL(request.url).pathname,
          ),
        ),
      )
    ).flat();
  });
  expect(cached.sort()).toEqual(
    [
      "/icons/icon-192.png",
      "/icons/icon-512.png",
      "/icons/maskable-512.png",
      "/offline.html",
    ].sort(),
  );
  await context.setOffline(true);
  await page.goto("/mosques/sample-cedar?mode=demo");
  await expect(page.getByRole("heading", { name: /offline/ })).toBeVisible();
  await expect(
    page.getByText("Minarah does not display cached schedules as current.", {
      exact: false,
    }),
  ).toBeVisible();
  await context.setOffline(false);
});
