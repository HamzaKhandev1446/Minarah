import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

async function login(page: Page, role: "MEMBER" | "PLATFORM") {
  await page.goto("/auth/login");
  await page
    .getByLabel("Email", { exact: true })
    .fill(process.env[`MINARAH_E2E_${role}_EMAIL`]!);
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env[`MINARAH_E2E_${role}_PASSWORD`]!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

test("staging submission, claim approval, private draft and published 20:45 Isha", async ({
  browser,
  baseURL,
}) => {
  const visitorContext = await browser.newContext({ baseURL });
  const memberContext = await browser.newContext({ baseURL });
  const platformContext = await browser.newContext({ baseURL });
  const visitor = await visitorContext.newPage();
  const member = await memberContext.newPage();
  const platform = await platformContext.newPage();
  const name = `TEST ONLY no prayer attendance ${randomUUID()}`;
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  try {
    await login(member, "MEMBER");
    await login(platform, "PLATFORM");
    await visitor.goto("/submit");
    await visitor.getByLabel("Mosque name", { exact: true }).fill(name);
    await visitor
      .getByLabel("Street address")
      .fill("Staging acceptance fixture; not a real mosque");
    await visitor.getByLabel("City", { exact: true }).fill("Staging test");
    await visitor.getByLabel("Country code").fill("PK");
    await visitor.getByLabel("Latitude", { exact: true }).fill("10");
    await visitor.getByLabel("Longitude", { exact: true }).fill("10");
    await visitor.getByLabel("IANA timezone").fill("UTC");
    await visitor
      .getByRole("button", { name: "Submit mosque for review" })
      .click();
    await expect(visitor.getByRole("status")).toContainText(
      "Mosque submitted for review",
    );

    await platform.goto("/platform");
    const submission = platform
      .getByRole("article")
      .filter({ has: platform.getByRole("heading", { name, exact: true }) });
    await submission
      .getByRole("button", { name: "Approve mosque submission" })
      .click();
    await expect(submission).toHaveCount(0);

    await visitor.goto("/?view=map");
    await visitor.getByLabel("Search by mosque name or city").fill(name);
    await visitor.getByRole("button", { name: "Search", exact: true }).click();
    await visitor
      .getByRole("button", { name: `Open ${name} timetable`, exact: true })
      .click();
    await visitor
      .getByRole("link", { name: "Mosque details & directions", exact: true })
      .click();
    const publicPath = new URL(visitor.url()).pathname;
    await member.goto(`${publicPath}/claim`);
    const mosqueId = await member
      .locator('input[name="mosqueId"]')
      .inputValue();
    // Submission approval alone grants no management access.
    const denied = await member.goto(`/admin/${mosqueId}`);
    expect(denied?.status()).toBe(404);
    await member.goto(`${publicPath}/claim`);
    await member
      .getByLabel("Your name", { exact: true })
      .fill("Staging acceptance tester");
    await member
      .getByLabel("Contact email or phone")
      .fill(process.env.MINARAH_E2E_MEMBER_EMAIL!);
    await member
      .getByLabel("Your role at the mosque")
      .fill("Staging test administrator");
    await member
      .getByLabel("Explain your authority")
      .fill(
        "Automated staging acceptance fixture only; this is not a real mosque claim.",
      );
    await member
      .getByRole("button", { name: "Submit claim for review" })
      .click();
    await expect(member.getByRole("status")).toContainText("Claim submitted");
    await platform.reload();
    const claim = platform
      .getByRole("article")
      .filter({ has: platform.getByRole("heading", { name, exact: true }) });
    await claim.getByLabel("Approved membership role").selectOption("editor");
    await claim
      .getByRole("button", { name: "Approve claim & verify mosque" })
      .click();
    await expect(claim).toHaveCount(0);
    await member.goto("/claims");
    await expect(
      member.getByRole("listitem").filter({ hasText: name }),
    ).toContainText("approved");
    await member.goto(`/admin/${mosqueId}`);
    await member.getByLabel("From", { exact: true }).fill(today);
    await member.getByLabel("Through", { exact: true }).fill(tomorrow);
    for (const [prayer, value] of [
      ["Fajr", "05:30"],
      ["Dhuhr", "13:15"],
      ["Asr", "17:00"],
      ["Maghrib", "18:45"],
      ["Isha", "20:30"],
    ])
      await member.getByLabel(prayer!, { exact: true }).fill(value!);
    await member
      .getByRole("button", { name: "Save Draft", exact: true })
      .click();
    await expect(member.getByRole("status")).toHaveText(
      "Draft saved. Public times have not changed.",
    );
    await visitor.reload();
    await expect(visitor.getByText("8:30 PM", { exact: true })).toHaveCount(0);
    await member
      .getByRole("button", { name: "Publish Changes", exact: true })
      .click();
    await expect
      .poll(async () => {
        await visitor.reload();
        return visitor.getByText("8:30 PM", { exact: true }).count();
      })
      .toBeGreaterThan(0);
    await member.getByLabel("Isha", { exact: true }).fill("20:45");
    await member
      .getByRole("button", { name: "Publish Changes", exact: true })
      .click();
    await expect
      .poll(async () => {
        await visitor.reload();
        return visitor.getByText("8:45 PM", { exact: true }).count();
      })
      .toBeGreaterThan(0);
    await member.reload();
    const history = member
      .locator("details")
      .filter({ hasText: "Previous publication" })
      .first();
    await history.locator("summary").click();
    await expect(history).toContainText("20:45");
    await expect(history).toContainText("20:30");
    await member.getByRole("link", { name: "View Mosque QR" }).click();
    await expect(
      member.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
    await member.goto("/admin");
    await member.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(member).toHaveURL(/\/auth\/login$/);
    await member.goto(`/admin/${mosqueId}`);
    await expect(member).toHaveURL(/\/auth\/login/);
  } finally {
    await Promise.all([
      visitorContext.close(),
      memberContext.close(),
      platformContext.close(),
    ]);
  }
});
