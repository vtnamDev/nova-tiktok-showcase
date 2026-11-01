import { describe, expect, it } from "vitest";
import { formatVnd, isSafeTikTokUrl, slugify } from "./validation";

describe("isSafeTikTokUrl", () => {
  it("accepts TikTok product links", () => {
    expect(isSafeTikTokUrl("https://www.tiktok.com/view/product/12345")).toBe(true);
    expect(isSafeTikTokUrl("https://vt.tiktok.com/abc123/")).toBe(true);
  });

  it("rejects other hosts and unsafe URL features", () => {
    expect(isSafeTikTokUrl("https://example.com/product/1")).toBe(false);
    expect(isSafeTikTokUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeTikTokUrl("https://user:pass@tiktok.com/")).toBe(false);
    expect(isSafeTikTokUrl("https://tiktok.com:8443/product/1")).toBe(false);
  });
});

describe("slugify", () => {
  it("creates stable Vietnamese slugs", () => {
    expect(slugify("Áo Thun Đẹp 2026")).toBe("ao-thun-dep-2026");
  });
});

describe("formatVnd", () => {
  it("formats VND without fractional digits", () => {
    expect(formatVnd(129000)).toContain("129");
    expect(formatVnd(129000)).toContain("₫");
  });
});
