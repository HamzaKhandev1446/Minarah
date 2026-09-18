import { test, expect } from "@playwright/test";

test("location is requested deliberately and manual search survives denial", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "locationRequests", {
      value: 0,
      writable: true,
    });
    Object.defineProperty(navigator, "geolocation", {
      value: {
        getCurrentPosition(
          _success: unknown,
          failure: (error: { code: number }) => void,
        ) {
          (window as unknown as { locationRequests: number })
            .locationRequests++;
          failure({ code: 1 });
        },
      },
    });
  });
  await page.goto("/?mode=demo");
  await expect(
    page.getByRole("button", { name: "Use my location", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { locationRequests: number }).locationRequests,
    ),
  ).toBe(0);
  await page
    .getByRole("button", { name: "Use my location", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "permission was denied" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Search manually", exact: true })
    .click();
  await page.getByRole("searchbox").fill("Cedar");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "View mosque", exact: true }),
  ).toBeVisible();
});

test("map selection, favourites persistence and full schedule", async ({
  page,
}, testInfo) => {
  await page.goto("/?mode=demo");
  await expect(
    page.getByRole("navigation", { name: "Mosque views" }).getByRole("button"),
  ).toHaveCount(2);
  await page.getByRole("button", { name: "Try sample location" }).click();
  const marker = page.locator(".open-time-pin").first();
  await expect(marker).toBeVisible();
  await expect(
    page.locator("[data-map-loaded=true], .map-load-error"),
  ).toBeVisible({
    timeout: 20000,
  });
  await marker.click();
  await expect(page.locator(".nearby-mosque-row.is-selected")).toBeVisible();
  await page.locator(".nearby-mosque-row.is-selected .favourite-heart").click();
  await expect(
    page.locator(".nearby-mosque-row.is-selected .favourite-heart"),
  ).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({
    path: testInfo.outputPath("nearby.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Favourites", exact: true }).click();
  await expect(page.locator(".favourites-list article")).toHaveCount(1);
  await page.reload();
  await page.getByRole("button", { name: "Favourites", exact: true }).click();
  await expect(page.locator(".favourites-list article")).toHaveCount(1);
  await page.screenshot({
    path: testInfo.outputPath("favourites.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.locator(".favourites-list article h2 a").click();
  await expect(page).toHaveURL(/\/mosques\//);
  await page.goto("/?mode=demo&view=following");
  await page.locator(".favourite-heart").click();
  await expect(
    page.getByRole("button", { name: "Explore Nearby" }),
  ).toBeVisible();
});

test("map failure keeps manual discovery usable", async ({ page }) => {
  await page.route("https://tiles.openfreemap.org/**", (route) =>
    route.abort(),
  );
  await page.goto("/?mode=demo");
  await expect(
    page.getByText("Map background unavailable.", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Search manually", exact: true })
    .click();
  await page.getByRole("searchbox").fill("Cedar");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "View mosque", exact: true }),
  ).toBeVisible();
});

test("registration map click selects a real coordinate pin", async ({
  page,
}, info) => {
  await page.goto("/register-mosque");
  const map = page.getByLabel("Registration map", { exact: true });
  await expect(map).toHaveAttribute("data-map-loaded", "true", {
    timeout: 20000,
  });
  await map.locator("canvas").click({ position: { x: 120, y: 190 } });
  await expect(
    page.getByRole("img", { name: "Mosque location pin", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Confirm mosque location", exact: true }),
  ).toBeEnabled();
  await page.screenshot({
    path: info.outputPath("registration-map.png"),
    fullPage: true,
  });
});

test("granted location appears on map without persisting coordinates", async ({
  page,
  context,
}, testInfo) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 24.8615, longitude: 67.011 });
  await page.goto("/?mode=demo");
  await page.screenshot({
    path: testInfo.outputPath("location.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Use my location", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Near your location" }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Your location", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    "24.8615",
  );
});
