import { test, expect } from "@playwright/test";

test("granted location stays transient and carries distance into the detail page", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "geolocation", {
      value: {
        getCurrentPosition: (
          success: (value: {
            coords: { latitude: number; longitude: number };
          }) => void,
        ) => success({ coords: { latitude: 24.8615, longitude: 67.011 } }),
      },
    }),
  );
  await page.goto("/?mode=demo&view=map");
  await page.getByRole("button", { name: "Use my location" }).click();
  await expect(page.getByRole("article")).toHaveCount(10);
  await page
    .getByRole("button", { name: "Open Cedar Community Mosque timetable" })
    .click();
  await page.getByRole("link", { name: "Mosque details & directions" }).click();
  await expect(page).toHaveURL(/mosques\/sample-cedar\?mode=demo/);
  await expect(page.getByRole("article")).toContainText("0 m away");
  expect(new URL(page.url()).searchParams.has("latitude")).toBe(false);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
  expect(await page.evaluate(() => Object.keys(sessionStorage))).toEqual([]);
});

test("automatic detail refresh applies changed data and reports a failed refresh", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/mosques/sample-cedar?mode=demo");
  // Interact and confirm hydration before advancing timers registered by effects.
  await page
    .getByRole("button", { name: "Follow Mosque", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Following · Unfollow" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.route("**/api/discovery", async (route) => {
    const response = await route.fetch();
    const payload = await response.json();
    payload.results[0].schedules.forEach(
      (schedule: {
        entries: { prayer: string; localTime: string }[];
        overrides: unknown[];
      }) => {
        schedule.entries.find((entry) => entry.prayer === "isha")!.localTime =
          "22:15";
        schedule.overrides = [];
      },
    );
    await route.fulfill({ response, json: payload });
  });
  await page.clock.fastForward(61000);
  await expect(
    page.getByText("10:15 PM", { exact: true }).first(),
  ).toBeVisible();
  await page.unroute("**/api/discovery");
  await page.route("**/api/discovery", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Unavailable" }),
    }),
  );
  await page.clock.fastForward(61000);
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Previously loaded information may have changed",
  );
});

test("unsupported, unavailable and timed-out location leave manual search available", async ({
  page,
}) => {
  await page.addInitScript(() => {
    let attempt = 0;
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (
          _success: unknown,
          failure: (error: { code: number }) => void,
        ) => failure({ code: ++attempt === 1 ? 2 : 3 }),
      },
    });
  });
  await page.goto("/?mode=demo&view=map");
  await page.getByRole("button", { name: "Use my location" }).click();
  await expect(
    page.getByText("Your position is unavailable.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Use my location" }).click();
  await expect(
    page.getByText("Finding your location timed out.", { exact: false }),
  ).toBeVisible();
  await page.evaluate(() =>
    Object.defineProperty(navigator, "geolocation", { value: undefined }),
  );
  await page.getByRole("button", { name: "Use my location" }).click();
  await expect(
    page.getByText("This browser does not support location.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByLabel("Search by mosque name or city")).toBeEnabled();
});

test("search, open, follow, reload, return and unfollow without login", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?mode=demo&view=map");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.getByLabel("Search by mosque name or city").fill("Cedar");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("article")).toHaveCount(1);
  await page.screenshot({
    path: test.info().outputPath("directory.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Open Cedar Community Mosque timetable" })
    .click();
  await page.getByRole("link", { name: "Mosque details & directions" }).click();
  await expect(page).toHaveURL(/mosques\/sample-cedar\?mode=demo/);
  await expect(
    page.getByRole("heading", { name: "Today’s Jamaat" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Follow Mosque", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Following · Unfollow" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Following · Unfollow" }),
  ).toBeVisible();
  await page
    .getByRole("main")
    .getByRole("link", { name: "Find mosques" })
    .click();
  await page
    .getByRole("button", { name: "Following (1)", exact: true })
    .click();
  await expect(page.getByRole("article")).toHaveCount(1);
  await page.getByRole("button", { name: "Following · Unfollow" }).click();
  await expect(
    page.getByRole("button", { name: "Following (0)", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("sample proximity is ordered and empty/manual search states work", async ({
  page,
}) => {
  await page.goto("/?mode=demo&view=map");
  await page.getByRole("button", { name: "Try sample location" }).click();
  await expect(page.getByRole("article")).toHaveCount(10);
  await expect(page.getByRole("article").first()).toContainText(
    "Cedar Community Mosque",
  );
  await expect(page.getByRole("article").first()).toContainText("0 m away");
  await page
    .getByLabel("Search by mosque name or city")
    .fill("No matching mosque");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(
    page.getByText("No registered mosques found.", { exact: false }),
  ).toBeVisible();
});

test("denied location recovers through manual search", async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "geolocation", {
      value: {
        getCurrentPosition: (
          _success: unknown,
          failure: (error: { code: number }) => void,
        ) => failure({ code: 1 }),
      },
    }),
  );
  await page.goto("/?mode=demo&view=map");
  await page.getByRole("button", { name: "Use my location" }).click();
  await expect(
    page.getByText("Location permission was denied.", { exact: false }),
  ).toBeVisible();
  await page.getByLabel("Search by mosque name or city").fill("Cedar");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("article")).toHaveCount(1);
});

test("blocked storage reports failure and never claims a follow", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Blocked", "SecurityError");
    };
  });
  await page.goto("/mosques/sample-cedar?mode=demo");
  await page
    .getByRole("button", { name: "Follow Mosque", exact: true })
    .click();
  await expect(
    page.getByText("Your browser could not save this change.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Follow Mosque", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
});

test("live API failure stays visible without synthetic replacement", async ({
  page,
}) => {
  await page.route("**/api/discovery", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        error: "Live directory temporarily unavailable.",
      }),
    }),
  );
  await page.goto("/?view=map");
  await page.getByLabel("Search by mosque name or city").fill("Cedar");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Live directory temporarily unavailable.",
  );
  await expect(page.getByRole("article")).toHaveCount(0);
});
