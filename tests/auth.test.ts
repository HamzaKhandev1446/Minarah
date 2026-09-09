import { afterEach, beforeEach, expect, it, vi } from "vitest";
const { createClient, exchangeCodeForSession, verifyOtp, resend } = vi.hoisted(
  () => ({
    createClient: vi.fn(),
    exchangeCodeForSession: vi.fn(),
    verifyOtp: vi.fn(),
    resend: vi.fn(),
  }),
);
vi.mock("@/lib/supabase/server", () => ({ createClient }));
import { GET } from "@/app/auth/callback/route";
import { authenticate } from "@/app/auth/actions";
import { parseSiteOrigin } from "@/lib/site-origin";
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://minarah.example");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-key");
  createClient.mockResolvedValue({
    auth: { exchangeCodeForSession, verifyOtp, resend },
  });
});
afterEach(() => vi.unstubAllEnvs());
it.each([
  undefined,
  "http://minarah.example",
  "https://user:pass@minarah.example",
  "https://minarah.example/path",
  "https://minarah.example?next=evil",
  "https://minarah.example/#hash",
  "http://localhost:3000",
])("rejects unsafe or missing deployment origin %s", (value) => {
  expect(() => parseSiteOrigin(value, true)).toThrow();
});
it("allows explicit loopback only outside public deployment", () => {
  expect(parseSiteOrigin("http://localhost:3000")).toBe(
    "http://localhost:3000",
  );
  expect(parseSiteOrigin("https://minarah.example/", true)).toBe(
    "https://minarah.example",
  );
});
it("exchanges a PKCE code and ignores an untrusted redirect destination", async () => {
  exchangeCodeForSession.mockResolvedValue({ error: null });
  const response = await GET(
    new Request(
      "https://evil.example/auth/callback?code=test&next=https://evil.example",
    ),
  );
  expect(exchangeCodeForSession).toHaveBeenCalledWith("test");
  expect(response.headers.get("location")).toBe(
    "https://minarah.example/admin",
  );
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(response.headers.get("referrer-policy")).toBe("no-referrer");
});
it("supports the email token-hash confirmation template", async () => {
  verifyOtp.mockResolvedValue({ error: null });
  const response = await GET(
    new Request(
      "https://minarah.example/auth/callback?token_hash=test&type=email",
    ),
  );
  expect(verifyOtp).toHaveBeenCalledWith({ token_hash: "test", type: "email" });
  expect(response.headers.get("location")).toBe(
    "https://minarah.example/admin",
  );
});
it("returns a confirmed representative to the fixed registration route", async () => {
  exchangeCodeForSession.mockResolvedValue({ error: null });
  const response = await GET(
    new Request(
      "https://minarah.example/auth/callback?code=test&next=/register-mosque",
    ),
  );
  expect(response.headers.get("location")).toBe(
    "https://minarah.example/register-mosque",
  );
});
it("offers confirmation recovery on network errors", async () => {
  exchangeCodeForSession.mockRejectedValue(new Error("network"));
  const response = await GET(
    new Request("https://minarah.example/auth/callback?code=test"),
  );
  expect(response.headers.get("location")).toBe(
    "https://minarah.example/auth/login?error=confirmation",
  );
});
it("does not verify unsupported token types", async () => {
  await GET(
    new Request(
      "https://minarah.example/auth/callback?token_hash=test&type=recovery",
    ),
  );
  expect(createClient).not.toHaveBeenCalled();
});
it("requests a replacement confirmation using the configured callback", async () => {
  resend.mockResolvedValue({ error: null });
  const form = new FormData();
  form.set("email", "test@example.test");
  form.set("password", "");
  form.set("intent", "resend");
  const state = await authenticate({ message: "" }, form);
  expect(resend).toHaveBeenCalledWith({
    type: "signup",
    email: "test@example.test",
    options: { emailRedirectTo: "https://minarah.example/auth/callback" },
  });
  expect(state.message).toContain("If this address");
});
