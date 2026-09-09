import { beforeEach, afterEach, it, expect, vi } from "vitest";
const { rpc, getUser } = vi.hoisted(() => ({ rpc: vi.fn(), getUser: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ rpc, auth: { getUser } }),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw Error("not-found");
  },
  redirect: () => {
    throw Error("redirect");
  },
}));
import { requireMember } from "@/server/auth";
const mosque = "00000000-0000-4000-8000-000000000001";
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test");
  getUser.mockResolvedValue({ data: { user: { id: "member" } }, error: null });
});
afterEach(() => vi.unstubAllEnvs());
it("preserves an existing manager only when the new timetable RPC is missing", async () => {
  rpc
    .mockResolvedValueOnce({ data: null, error: { code: "PGRST202" } })
    .mockResolvedValueOnce({ data: true, error: null });
  await requireMember(mosque, true);
  expect(rpc).toHaveBeenNthCalledWith(2, "can_manage_mosque", {
    target_mosque: mosque,
  });
});
it.each([
  { data: false, error: null },
  { data: null, error: { code: "42501" } },
  { data: null, error: { code: "NETWORK" } },
])(
  "never relaxes denied or failing timetable authorization",
  async (result) => {
    rpc.mockResolvedValue(result);
    await expect(requireMember(mosque, true)).rejects.toThrow("not-found");
    expect(rpc).toHaveBeenCalledTimes(1);
  },
);
it("does not grant a non-manager access through the migration fallback", async () => {
  rpc
    .mockResolvedValueOnce({ data: null, error: { code: "PGRST202" } })
    .mockResolvedValueOnce({ data: false, error: null });
  await expect(requireMember(mosque, true)).rejects.toThrow("not-found");
});
