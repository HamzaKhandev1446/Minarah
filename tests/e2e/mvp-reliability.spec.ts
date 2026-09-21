import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("https://tiles.openfreemap.org/styles/positron", route => route.fulfill({ json: { version: 8, sources: {}, layers: [] } }));
});

test("drawer keeps installation, notifications and location controls accessible", async ({ page }, info) => {
  await page.route("**/api/push/subscription", route => route.fulfill({ json: { available: false, publicKey: null } }));
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  const drawer = page.getByRole("dialog", { name: "Minarah" });
  await expect(drawer.getByRole("link", { name: /Login/ })).toBeVisible();
  await drawer.getByText("Notifications", { exact: true }).click();
  await expect(drawer.getByRole("button", { name: "Enable background alerts" })).toBeDisabled();
  await expect(drawer.getByText("Background delivery is not connected", { exact: false })).toBeVisible();
  await page.screenshot({ path: info.outputPath("drawer.png"), fullPage: true });
  await page.keyboard.press("Escape");
  await expect(drawer).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Open menu" })).toBeFocused();
});

test("search saves a new location with only a name", async ({ page }) => {
  await page.route("https://photon.komoot.io/api/**", route => route.fulfill({json: {features: [{geometry: {type: "Point", coordinates: [67.011, 24.8615]}, properties: {name: "Demo workplace", city: "Karachi", countrycode: "PK"}}]}}));
  await page.route("**/api/discovery", route => route.fulfill({json: {results: [], fetchedAt: new Date().toISOString(), radiusMeters: 800}}));
  await page.goto("/");
  await page.getByRole("button", {name: "Choose your location", exact: true}).click();
  await page.getByRole("searchbox", {name: "Search for a new location"}).fill("Demo workplace");
  await page.getByRole("button", {name: "Search locations", exact: true}).click();
  await page.getByRole("button", {name: /Demo workplace/}).click();
  await page.getByLabel("Place name", {exact: true}).fill("Work");
  await page.getByRole("button", {name: "Save", exact: true}).click();
  await expect(page.getByRole("button", {name: "Work", exact: true})).toBeVisible();
  await page.reload();
  await page.getByRole("button", {name: "Choose your location", exact: true}).click();
  await expect(page.getByRole("button", {name: "Work Saved location", exact: true})).toBeVisible();
});

test("Friday has six columns, Arabic live label and honest failed-refresh state", async ({ page }, info) => {
  const now = "2026-09-18T08:45:00Z";
  await page.clock.setFixedTime(new Date(now));
  const id = "00000000-0000-4000-8000-000000000001";
  const sample = {
    mosques: [{ id, slug: "test-mosque", name: "Test Mosque", addressLine: "Test street", locality: "Test area", city: "Karachi", countryCode: "PK", latitude: 24.8615, longitude: 67.011, timezone: "Asia/Karachi", verificationStatus: "unverified", isSynthetic: true }],
    schedules: [{ id: "10000000-0000-4000-8000-000000000001", mosqueId: id, effectiveFrom: "2026-09-01", effectiveTo: null, status: "published", revision: 1, publishedAt: now, overrides: [], entries: ["fajr", "dhuhr", "asr", "maghrib", "isha"].map((prayer, index) => ({prayer, localTime: ["05:30", "13:15", "17:15", "18:42", "20:15"][index]})) }],
  };
  const data = { fetchedAt: now, radiusMeters: 800, results: [{mosque: sample.mosques[0]!, distanceMeters: 40, schedules: [{...sample.schedules[0]!, jumuahSessions: [{position: 1, localTime: "13:45", label: "Jumuah"}]}]}] };
  let fail = false;
  await page.route("**/api/discovery", route => fail ? route.fulfill({status: 503, json: {error: "Unavailable"}}) : route.fulfill({json: data}));
  await page.goto("/?mode=demo");
  await page.getByRole("button", {name: "Try sample location"}).click();
  await expect(page.locator(".jamaat-time-cell")).toHaveCount(6);
  await expect(page.locator(".jummah-badge")).toHaveText("Jummah");
  await expect(page.locator(".qad-label").first()).toHaveText("قَدْ قَامَتِ الصَّلَاةُ");
  await page.screenshot({ path: info.outputPath("friday.png"), fullPage: true });
  fail = true;
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByRole("alert")).toContainText("last successfully loaded times");
  await expect(page.locator(".jamaat-time-cell")).toHaveCount(6);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
