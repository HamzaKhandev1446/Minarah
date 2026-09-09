import { beforeEach, expect, it, vi } from "vitest";
const { rpc, requireMember, revalidatePath } = vi.hoisted(() => ({
  rpc: vi.fn(),
  requireMember: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("@/server/auth", () => ({ requireMember }));
vi.mock("next/cache", () => ({ revalidatePath }));
import { saveSchedule } from "@/app/admin/[mosqueId]/actions";
const id = "00000000-0000-4000-8000-000000000001";
const previous = {
  message: "",
  draftId: null,
  revision: null,
  published: false,
};
function form(existing = false) {
  const result = new FormData();
  result.set("mosqueId", id);
  result.set("intent", "publish");
  if (existing) {
    result.set("draftId", id);
    result.set("revision", "4");
  }
  result.set(
    "payload",
    JSON.stringify({
      effectiveFrom: "2030-01-01",
      effectiveTo: "2030-01-31",
      entries: ["fajr", "dhuhr", "asr", "maghrib", "isha"].map((prayer) => ({
        prayer,
        localTime: "12:00",
      })),
      jumuahSessions: [],
      overrides: [],
    }),
  );
  return result;
}
beforeEach(() => {
  vi.resetAllMocks();
  requireMember.mockResolvedValue({ db: { rpc } });
});
it.each([false, true])(
  "publishes only the revision produced by this save (existing: %s)",
  async (existing) => {
    rpc
      .mockResolvedValueOnce({ data: id, error: null })
      .mockResolvedValueOnce({ error: { code: "40001" } });
    const state = await saveSchedule(previous, form(existing));
    expect(rpc).toHaveBeenLastCalledWith("publish_schedule", {
      target_schedule: id,
      expected_revision: existing ? 5 : 1,
    });
    expect(state.published).toBe(false);
    expect(state.revision).toBe(existing ? 5 : 1);
    expect(revalidatePath).not.toHaveBeenCalled();
  },
);
it("checks membership before touching a draft", async () => {
  requireMember.mockRejectedValue(new Error("Forbidden"));
  await expect(saveSchedule(previous, form())).rejects.toThrow("Forbidden");
  expect(rpc).not.toHaveBeenCalled();
});
it("retains the existing draft identity after a validation error", async () => {
  const invalid = form(true);
  invalid.set("payload", JSON.stringify({ effectiveFrom: "invalid" }));
  const state = await saveSchedule(previous, invalid);
  expect(state.draftId).toBe(id);
  expect(state.revision).toBe(4);
  expect(state.published).toBe(false);
  expect(rpc).not.toHaveBeenCalled();
});
