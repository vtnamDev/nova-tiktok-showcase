export function isSafeTikTokUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return ["http:", "https:"].includes(url.protocol)
      && !url.username && !url.password && !url.port
      && (host === "tiktok.com" || host.endsWith(".tiktok.com"))
      && !/\s/.test(value) && value.length <= 2048;
  } catch {
    return false;
  }
}

export function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "").slice(0, 80);
}

export const formatVnd = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
