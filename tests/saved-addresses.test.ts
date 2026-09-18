import { describe, it, expect } from "vitest";
import { parseSavedAddresses } from "@/lib/saved-addresses";
describe("saved addresses", () => {
  const place = {
    id: "10000000-0000-4000-8000-000000000001",
    kind: "home",
    label: "Home",
    address: "Parsa Citi",
    latitude: 24.87,
    longitude: 67.02,
  };
  it("restores valid local addresses", () => {
    expect(parseSavedAddresses(JSON.stringify([place]))).toEqual([place]);
  });
  it("rejects corrupt data and invalid coordinates", () => {
    expect(parseSavedAddresses("broken")).toEqual([]);
    expect(
      parseSavedAddresses(JSON.stringify([{ ...place, latitude: 200 }])),
    ).toEqual([]);
  });
  it("bounds the saved list", () => {
    expect(parseSavedAddresses(JSON.stringify(Array(21).fill(place)))).toEqual(
      [],
    );
  });
});
