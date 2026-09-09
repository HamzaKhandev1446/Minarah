import { test, expect } from "@playwright/test";

test("map search finds an unregistered place, saves it and passes its pin to registration", async ({
  page,
}) => {
  await page.route("**/api/discovery", (route) =>
    route.fulfill({
      json: {
        results: [],
        radiusMeters: 5000,
        mode: "live",
        fetchedAt: new Date().toISOString(),
      },
    }),
  );
  await page.route("https://photon.komoot.io/api/**", (route) =>
    route.fulfill({
      json: {
        features: [
          {
            geometry: { type: "Point", coordinates: [67.011, 24.8615] },
            properties: {
              name: "Test Masjid",
              city: "Karachi",
              countrycode: "PK",
            },
          },
        ],
      },
    }),
  );
  await page.goto("/");
  await page.getByLabel("Search by mosque name or city").fill("Test Masjid");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.locator(".place-pin")).toHaveCount(1);
  await page.locator(".place-pin").click();
  const card = page.getByRole("article", { name: "Selected map place" });
  await expect(card).toContainText("No mosque-published Jamaat times");
  await card.getByRole("button", { name: "Add place to favourites" }).click();
  await page.goto("/?view=following");
  await page
    .getByRole("button", { name: "Test Masjid, Karachi", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Register this mosque", exact: true })
    .click();
  await expect(
    page.getByText("Selected mosque location:", { exact: false }),
  ).toContainText("24.861500, 67.011000");
});

test("home opens a map even before a search returns results", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Map & discover", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByLabel("Interactive mosque map", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".leaflet-control-zoom-in")).toBeVisible();
  await expect(page.getByLabel("Search by mosque name or city")).toBeVisible();
});

test("search a place, confirm its pin and reach account setup without losing the location", async ({
  page,
}, info) => {
  await page.route("https://photon.komoot.io/api/**", (route) =>
    route.fulfill({
      json: {
        features: [
          {
            geometry: { type: "Point", coordinates: [67.011, 24.8615] },
            properties: {
              name: "Test Masjid",
              city: "Karachi",
              countrycode: "PK",
              street: "Test Road",
            },
          },
        ],
      },
    }),
  );
  await page.goto("/register-mosque");
  await expect(page.getByLabel("Email", { exact: true })).toHaveCount(0);
  await page
    .getByLabel("Search mosque, street or city")
    .fill("Test Masjid Karachi");
  await page
    .getByRole("button", { name: "Search places", exact: true })
    .click();
  await page.getByRole("button", { name: "Test Masjid, Karachi, PK" }).click();
  await expect(page.locator(".mosque-pin")).toHaveCount(1);
  await expect(
    page.getByText("Selected mosque location:", { exact: false }),
  ).toContainText("24.861500, 67.011000");
  await page.screenshot({
    path: info.outputPath("registration-pin.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Confirm mosque location" }).click();
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
  await page
    .getByLabel("Password", { exact: true })
    .fill("not-stored-test-password");
  expect(
    await page.evaluate(() =>
      JSON.stringify({ ...sessionStorage, ...localStorage }),
    ),
  ).not.toContain("not-stored-test-password");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Create your representative account" }),
  ).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
  await page.getByRole("button", { name: "Change location" }).click();
  await expect(page.locator(".mosque-pin")).toHaveCount(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("current location and manual coordinates work when place search fails", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 24.86, longitude: 67.01 });
  await page.route("https://photon.komoot.io/api/**", (route) => route.abort());
  await page.goto("/register-mosque/new");
  await page.getByLabel("Search mosque, street or city").fill("Failed lookup");
  await page
    .getByRole("button", { name: "Search places", exact: true })
    .click();
  await expect(
    page.getByText("Place search unavailable.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Use current location" }).click();
  await expect(
    page.getByText("Selected mosque location:", { exact: false }),
  ).toContainText("24.860000, 67.010000");
  await page.getByText("Enter exact coordinates", { exact: true }).click();
  await page.getByLabel("Latitude", { exact: true }).fill("31.52");
  await page.getByLabel("Longitude", { exact: true }).fill("74.35");
  await page.getByRole("button", { name: "Set coordinates" }).click();
  await expect(
    page.getByText("Selected mosque location:", { exact: false }),
  ).toContainText("31.520000, 74.350000");
});
