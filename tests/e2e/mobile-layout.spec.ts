import { test, expect } from "@playwright/test";

test("saved Home persists, selects nearby coordinates and can be removed", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({
    latitude: 24.870630810049292,
    longitude: 67.02463726936347,
  });
  await page.route("https://tiles.openfreemap.org/styles/positron", (route) =>
    route.fulfill({ json: { version: 8, sources: {}, layers: [] } }),
  );
  await page.route("**/api/discovery", (route) =>
    route.fulfill({
      json: {
        results: [],
        fetchedAt: new Date().toISOString(),
        radiusMeters: 800,
      },
    }),
  );
  await page.goto("/");
  await expect(page.getByLabel("Place name", { exact: true })).toHaveCount(0);
  // Already-granted permission restores the current location automatically.
  await page
    .getByRole("button", { name: "your location", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Save this place", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").getByLabel("Place name", { exact: true }),
  ).toHaveCount(1);
  await page.getByLabel("Place name", { exact: true }).fill("Home");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: "Home", exact: true }).click();
  const request = page.waitForRequest((request) =>
    request.url().includes("/api/discovery"),
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Home Saved location", exact: true })
    .click();
  expect((await request).postDataJSON().query).toEqual({
    kind: "nearby",
    latitude: 24.870630810049292,
    longitude: 67.02463726936347,
  });
  await expect(
    page.getByRole("button", { name: "Home", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Edit saved place Home", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Delete saved place Home", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("button", { name: "Home Saved location", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Close location selector" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("a map point can be saved with only a name, without GPS", async ({
  page,
}) => {
  await page.route("https://tiles.openfreemap.org/styles/positron", (route) =>
    route.fulfill({ json: { version: 8, sources: {}, layers: [] } }),
  );
  await page.route("**/api/discovery", (route) =>
    route.fulfill({
      json: {
        results: [],
        fetchedAt: new Date().toISOString(),
        radiusMeters: 800,
      },
    }),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Choose your location", exact: true })
    .click();
  const map = page.getByLabel("Choose a point on the map", { exact: true });
  await expect(map).toHaveAttribute("data-map-loaded", "true");
  const canvas = map.locator("canvas");
  const bounds = await canvas.boundingBox();
  await canvas.click({
    position: { x: bounds!.width * 0.45, y: bounds!.height * 0.5 },
  });
  await page
    .getByRole("button", { name: "Save this place", exact: true })
    .click();
  await page.getByLabel("Place name", { exact: true }).fill("Work");
  const request = page.waitForRequest((request) =>
    request.url().includes("/api/discovery"),
  );
  await page.getByRole("button", { name: "Save", exact: true }).click();
  const query = (await request).postDataJSON().query;
  const places = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("minarah:saved-addresses:v1")!),
  );
  expect(places).toHaveLength(1);
  expect(places[0].label).toBe("Work");
  expect(query).toEqual({
    kind: "nearby",
    latitude: places[0].latitude,
    longitude: places[0].longitude,
  });
  expect(query.latitude).toBeGreaterThan(24.84);
  expect(query.latitude).toBeLessThan(24.9);
  expect(query.longitude).toBeGreaterThan(67.0);
  expect(query.longitude).toBeLessThan(67.05);
  await page.getByRole("button", { name: "Work", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("prominent logo and map take priority over the location panel", async ({
  page,
}, info) => {
  await page.route("https://tiles.openfreemap.org/styles/positron", (route) =>
    route.fulfill({
      json: {
        version: 8,
        sources: {},
        layers: [
          {
            id: "background",
            type: "background",
            paint: { "background-color": "#e5eadf" },
          },
        ],
      },
    }),
  );
  await page.goto("/");
  await expect(page.locator("[data-map-loaded=true]")).toBeVisible();
  const logo = await page.locator(".public-topbar .brand svg").boundingBox();
  const map = await page.locator(".nearby-map").boundingBox();
  const panel = await page.locator(".location-explanation").boundingBox();
  expect(logo!.width).toBe(25);
  expect(logo!.height).toBe(50);
  expect(map!.height).toBeGreaterThanOrEqual(400);
  expect(map!.height).toBeGreaterThan(panel!.height * 1.7);
  expect(panel!.height).toBeLessThan(270);
  await expect(page.getByText("0.8 km radius", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Use my location", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("mobile-layout.png"),
    fullPage: true,
  });
});
