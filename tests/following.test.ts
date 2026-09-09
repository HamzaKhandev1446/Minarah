import { expect, it } from "vitest";
import {
  opensKey,
  parseOpens,
  rankFollowed,
  recordOpen,
} from "@/lib/follows/ranking";
import { followsKey } from "@/lib/follows/storage";
import { canManageMosque } from "@/domain/authorization";
const a = "00000000-0000-4000-8000-000000000001";
const b = "00000000-0000-4000-8000-000000000002";
it("ranks followed mosques by local opens and preserves follow order on ties", () => {
  const results = [a, b, "unknown"].map((id) => ({ mosque: { id } }));
  expect(
    rankFollowed(results, [a, b], { [b]: 2 }).map((r) => r.mosque.id),
  ).toEqual([b, a]);
  expect(rankFollowed(results, [b, a], {}).map((r) => r.mosque.id)).toEqual([
    b,
    a,
  ]);
});
it("counts only follows, discards removed IDs, and separates live and demo", () => {
  const data = new Map([
    [followsKey("demo"), JSON.stringify([a])],
    [opensKey("demo"), JSON.stringify({ [b]: 8 })],
  ]);
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
  recordOpen(storage, "demo", b);
  expect(parseOpens(data.get(opensKey("demo"))!)).toEqual({ [b]: 8 });
  recordOpen(storage, "demo", a);
  expect(parseOpens(data.get(opensKey("demo"))!)).toEqual({ [a]: 1 });
  expect(data.has(opensKey("live"))).toBe(false);
});
it.each(["bad", '{"x":4}', `{"${a}":-1}`, `{"${a}":1000001}`])(
  "ignores malformed ranking %s",
  (raw) => expect(parseOpens(raw)).toEqual({}),
);
it("moderators can edit but cannot publish or view QR", () => {
  const member = {
    userId: a,
    mosqueId: b,
    role: "moderator" as const,
    status: "active" as const,
  };
  expect(canManageMosque(a, b, member, "edit_schedule")).toBe(true);
  expect(canManageMosque(a, b, member, "publish_schedule")).toBe(false);
  expect(canManageMosque(a, b, member, "view_qr")).toBe(false);
});
