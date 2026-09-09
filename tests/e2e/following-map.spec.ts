import { test, expect } from "@playwright/test";
const cedar = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";
test("Following ranks favourite mosques and opens their board without a new request", async ({
  page,
}, info) => {
  await page.addInitScript(
    ({ cedar, other }) => {
      localStorage.setItem(
        "minarah:follows:v1:demo",
        JSON.stringify([other, cedar]),
      );
      localStorage.setItem(
        "minarah:opens:v1:demo",
        JSON.stringify({ [cedar]: 5, [other]: 1 }),
      );
    },
    { cedar, other },
  );
  await page.goto("/?mode=demo&view=following");
  await expect(
    page.getByRole("heading", { name: "Mosques you follow" }),
  ).toBeVisible();
  const tiles = page.locator(".mosque-tile");
  await expect(tiles).toHaveCount(2);
  await expect(tiles.first()).toContainText("Cedar Community Mosque");
  await page.screenshot({
    path: info.outputPath("following.png"),
    fullPage: true,
  });
  let requests = 0;
  await page.route("**/api/discovery", (route) => {
    requests++;
    return route.abort();
  });
  await tiles
    .first()
    .getByRole("button", { name: "Open Cedar Community Mosque timetable" })
    .click();
  await expect(
    page.getByRole("article", { name: "Cedar Community Mosque timetable" }),
  ).toBeVisible();
  await expect(page.locator(".board-prayers > div")).toHaveCount(5);
  expect(requests).toBe(0);
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("minarah:opens:v1:demo")!)[
          "00000000-0000-4000-8000-000000000001"
        ],
    ),
  ).toBe(6);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("mosque-board.png"),
    fullPage: true,
  });
});
test("empty Following leads to map discovery and marker selection", async ({
  page,
}) => {
  await page.route("https://tile.openstreetmap.org/**", (route) =>
    route.abort(),
  );
  await page.goto("/?mode=demo&view=following");
  await page
    .getByRole("button", { name: "Find a mosque", exact: true })
    .click();
  await page.getByRole("button", { name: "Try sample location" }).click();
  await expect(page.locator(".mosque-pin")).toHaveCount(10);
  await expect(
    page.getByText("The map background could not load.", { exact: false }),
  ).toBeVisible();
  await page.locator(".mosque-pin").first().click();
  await expect(page.locator(".mosque-board")).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("minarah:follows:v1:demo")),
  ).toBeNull();
});
test("mosque management lives behind registration and phone installation has instructions", async ({
  page,
}) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  await expect(
    nav.getByRole("link", { name: "Add Mosque", exact: true }),
  ).toHaveCount(0);
  await expect(
    nav.getByRole("link", { name: "Manage mosque", exact: true }),
  ).toHaveCount(0);
  await nav.getByRole("link", { name: "Register your mosque" }).click();
  await expect(
    page.getByRole("button", { name: "Confirm mosque location" }),
  ).toBeDisabled();
  await expect(
    page.getByLabel("Registration map", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Manage mosque", exact: true }),
  ).toBeVisible();
  await page
    .getByText("Install Minarah on your phone", { exact: true })
    .click();
  await expect(page.getByText("iPhone:", { exact: true })).toBeVisible();
  await page.goto("/register-mosque/new");
  await expect(
    page.getByRole("heading", { name: "Where is your mosque?" }),
  ).toBeVisible();
});
