import { describe, expect, it } from "vitest";
import { sniffMime } from "./storage.js";

describe("sniffMime", () => {
  it("detecta el tipo real por los bytes", () => {
    expect(sniffMime(Buffer.from("%PDF-1.7 xxxxxxxx"))).toBe("application/pdf");
    expect(sniffMime(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe("image/jpeg");
  });
  it("rechaza un ejecutable renombrado a .jpg", () => {
    expect(sniffMime(Buffer.from("MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00"))).toBeNull();
  });
});
