import { expect, test } from "@playwright/test";
import { createRequire } from "node:module";
import type { AxeResults } from "axe-core";
const require = createRequire(import.meta.url);

test("public forms, detail and poster pass automated accessibility checks", async ({
  page,
}) => {
  for (const path of [
    "/?mode=demo",
    "/register-mosque",
    "/mosques/sample-cedar?mode=demo",
    "/auth/login?error=confirmation",
    "/submit",
    "/demo/qr/sample-cedar",
  ]) {
    await page.goto(path);
    await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
    const result = await page.evaluate(async () => {
      const axe = (
        window as unknown as {
          axe: { run: (options: unknown) => Promise<AxeResults> };
        }
      ).axe;
      return axe.run({
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
      });
    });
    expect
      .soft(
        result.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          targets: v.nodes.map((n) => n.target),
        })),
        path,
      )
      .toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      path,
    ).toBe(true);
  }
});

test("confirmation failures explain recovery without leaking auth tokens", async ({
  page,
}) => {
  // NEXT_PUBLIC_SITE_URL is fixed at build time; inspect the canonical redirect
  // then open its path on this isolated test server.
  const response = await page.request.get("/auth/callback", {
    maxRedirects: 0,
  });
  expect(response.status()).toBe(307);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const destination = new URL(response.headers().location!);
  expect(destination.pathname + destination.search).toBe(
    "/auth/login?error=confirmation",
  );
  await page.goto(destination.pathname + destination.search);
  await expect(page).toHaveURL(/\/auth\/login\?error=confirmation$/);
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "confirmation link could not be used",
  );
  await expect(
    page.getByRole("button", { name: "Resend confirmation email" }),
  ).toBeVisible();
});

test("print poster hides navigation and fits an A4 page", async ({
  page,
}, testInfo) => {
  await page.goto("/demo/qr/sample-cedar");
  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("navigation")).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Print QR poster" }),
  ).toBeHidden();
  await expect(page.locator(".qr-poster img")).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("poster-print.png"),
    fullPage: true,
  });
  if (testInfo.project.name === "desktop") {
    const pdf = await page.pdf({
      path: testInfo.outputPath("poster-a4.pdf"),
      format: "A4",
      printBackground: true,
    });
    // Chromium emits one /Type /Page dictionary per printed page.
    expect(pdf.toString("latin1").match(/\/Type\s*\/Page\b/g)).toHaveLength(1);
  }
});
