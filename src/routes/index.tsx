import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowUpRight, Search, ShoppingBag, Sparkles, ShieldCheck, Truck } from "lucide-react";
import { getPublicCatalog, trackCatalogEvent } from "@/lib/catalog.functions";
import { formatVnd } from "@/lib/validation";

export const Route = createFileRoute("/")({
  loader: () => getPublicCatalog(),
  component: Storefront,
});

function Storefront() {
  const catalog = Route.useLoaderData();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

  const visible = useMemo(() => catalog.products.filter((item: any) => {
    const matchesQuery = (item.name + " " + item.description).toLowerCase().includes(query.toLowerCase());
    const matchesCategory = activeCategory === "all" || item.categories.some((c: any) => c?.id === activeCategory);
    return matchesQuery && matchesCategory;
  }), [catalog.products, query, activeCategory]);

  const buy = async (item: any) => {
    const variant = item.variants.find((v: any) => v.id === selectedVariants[item.id]);
    const url = variant?.tiktokUrl || item.tiktokUrl;
    if (!url) return;
    await trackCatalogEvent({ data: { productId: item.id, variantId: variant?.id, eventType: "tiktok_click" } });
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <main className="store-shell">
      <div className="announcement">NOVA CURATED — Sản phẩm đa ngành hàng, mua trực tiếp trên TikTok Shop <span>↗</span></div>
      <header className="store-header">
        <Link to="/" className="brand">NOVA<span>.</span><small>CURATED GOODS</small></Link>
        <nav><a href="#catalog">Sản phẩm</a><a href="#about">Về NOVA</a></nav>
        <Link to="/auth" className="admin-link">Quản trị <ArrowUpRight size={15}/></Link>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow"><Sparkles size={14}/> SELECTED FOR EVERYDAY</p>
          <h1>Khám phá điều<br/><em>đáng sở hữu.</em></h1>
          <p className="hero-text">Một tuyển chọn đa dạng từ thời trang, công nghệ đến những món đồ hữu ích cho cuộc sống — tất cả trong một nơi.</p>
          <a href="#catalog" className="button button-primary hero-cta">Khám phá bộ sưu tập <ArrowUpRight size={16}/></a>
          <div className="hero-proof"><span><ShieldCheck size={15}/> Danh mục tuyển chọn</span><span><ShoppingBag size={15}/> Mua trên TikTok Shop</span></div>
        </div>
        <div className="hero-art" aria-label="NOVA product showcase">
          <div className="art-glow"/>
          <div className="art-card art-card-back"><span>ESSENTIALS</span><strong>01 / 04</strong></div>
          <div className="art-card art-card-front"><span className="art-tag">NOVA PICK</span><div className="art-shape"><i/><b/><em/></div><div className="art-caption"><strong>Objects with purpose.</strong><small>CURATED COLLECTION · 2026</small></div></div>
          <div className="art-orbit orbit-a"/><div className="art-orbit orbit-b"/>
        </div>
      </section>

      <section className="trust-row" id="about">
        <div><span className="trust-icon"><ShieldCheck size={18}/></span><span><strong>Thông tin rõ ràng</strong><small>Giá và mô tả minh bạch</small></span></div>
        <div><span className="trust-icon"><Truck size={18}/></span><span><strong>Đặt hàng an toàn</strong><small>Thanh toán trên TikTok Shop</small></span></div>
        <div><span className="trust-icon"><Sparkles size={18}/></span><span><strong>Đa dạng lựa chọn</strong><small>Danh mục được cập nhật</small></span></div>
      </section>

      <section className="catalog-section" id="catalog">
        <div className="section-heading">
          <div><p className="eyebrow">THE NOVA SELECTION</p><h2>Sản phẩm nổi bật<span>.</span></h2><p className="muted">Chọn sản phẩm, chọn phiên bản và tiếp tục mua trên TikTok.</p></div>
          <label className="search-box"><Search size={17}/><input placeholder="Tìm sản phẩm…" value={query} onChange={(e) => setQuery(e.target.value)}/></label>
        </div>
        <div className="category-row">
          <button className={activeCategory === "all" ? "category-pill active" : "category-pill"} onClick={() => setActiveCategory("all")}>Tất cả</button>
          {catalog.categories.map((item: any) => <button key={item.id} className={activeCategory === item.id ? "category-pill active" : "category-pill"} onClick={() => setActiveCategory(item.id)}>{item.name}</button>)}
        </div>

        {!catalog.configured ? (
          <div className="empty-state"><div className="empty-icon">N.</div><h3>Catalog đang được kết nối</h3><p>Hệ thống sẽ hiển thị sản phẩm sau khi Neon database được cấu hình và có dữ liệu.</p></div>
        ) : visible.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">N.</div><h3>Chưa có sản phẩm phù hợp</h3><p>Hãy thử từ khóa hoặc danh mục khác.</p></div>
        ) : (
          <div className="product-grid">
            {visible.map((item: any, index: number) => {
              const variant = item.variants.find((v: any) => v.id === selectedVariants[item.id]);
              const image = item.images[0]?.url;
              return (
                <article className="product-card" key={item.id}>
                  <div className={"product-visual visual-" + (index % 6)}>
                    {image ? <img src={image} alt={item.name} loading="lazy"/> : <div className="visual-monogram">{item.name.slice(0,1).toUpperCase()}</div>}
                    {item.featured && <span className="product-badge">NOVA PICK</span>}
                  </div>
                  <div className="product-info">
                    <div className="product-cats">{item.categories.map((c: any) => c?.name).filter(Boolean).join(" · ") || "COLLECTION"}</div>
                    <h3>{item.name}</h3>
                    <p>{item.description}</p>
                    {item.variants.length > 0 && (
                      <label className="variant-select">Phiên bản
                        <select value={selectedVariants[item.id] || ""} onChange={(e) => setSelectedVariants((s) => ({ ...s, [item.id]: e.target.value }))}>
                          <option value="">Chọn phiên bản</option>
                          {item.variants.map((v: any) => <option key={v.id} value={v.id}>{v.name} · {formatVnd(v.price)}</option>)}
                        </select>
                      </label>
                    )}
                    <div className="product-bottom"><strong>{formatVnd(variant?.price ?? item.price)}</strong><button className="buy-button" onClick={() => buy(item)} disabled={!variant && item.variants.length > 0 || !(variant?.tiktokUrl || item.tiktokUrl)}>Mua trên TikTok <ArrowUpRight size={15}/></button></div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <footer className="store-footer"><Link to="/" className="brand">NOVA<span>.</span></Link><p>Thoughtfully selected. Easy to explore.</p><small>© 2026 NOVA STORE · Mua hàng và thanh toán được thực hiện trên TikTok Shop.</small></footer>
    </main>
  );
}
