import { describe, expect, it } from "vitest";
import { getGroupColorHex, getGroupColorRgb } from "./group-color";

describe("group color helpers", () => {
  it("maps Chrome tab group colors to stable UI colors", () => {
    expect(getGroupColorHex("green")).toBe("#16a34a");
    expect(getGroupColorRgb("orange")).toEqual([234, 88, 12]);
  });

  it("falls back for missing or unknown colors", () => {
    expect(getGroupColorHex()).toBe("#2563ff");
    expect(getGroupColorHex("unknown")).toBe("#2563ff");
  });
});
