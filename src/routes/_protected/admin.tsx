import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Save, Trash2, ExternalLink, Users, FolderPlus, Package, Search, LogOut, Copy, Upload } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { getAdminData, saveProduct, deleteProduct, saveCategory, deleteCategory, createInvitation, updateMemberRole } from "@/lib/admin.functions";
import { formatVnd } from "@/lib/validation";

export const Route = createFileRoute("/_protected/admin")({
  loader: () => getAdminData(),
  component: AdminPage,
});

function AdminPage() {
  const initial = Route.useLoaderData();
  const router = useRouter();
  const saveProductFn = useServerFn(saveProduct);
  const deleteProductFn = useServerFn(deleteProduct);
  const saveCategoryFn = useServerFn(saveCategory);
  const deleteCategoryFn = useServerFn(deleteCategory);
  const createInvitationFn = useServerFn(createInvitation);
  const updateMemberRoleFn = useServerFn(updateMemberRole);
  const [tab, setTab] = useState("products");
  const [editingId, setEditingId] = useState<string | undefined>();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("0");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [status, setStatus] = useState<"draft" | "published" | "archived">("draft");
  const [featured, setFeatured] = useState(false);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [imageUrls, setImageUrls] = useState("");
  const [variantsJson, setVariantsJson] = useState("[]");
  const [categoryName, setCategoryName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "editor" | "viewer">("editor");
  const [inviteUrl, setInviteUrl] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  const canEdit = ["owner", "admin", "editor"].includes(initial.role);
  const canManage = ["owner", "admin"].includes(initial.role);
  const isOwner = initial.role === "owner";
  const products = useMemo(() => initial.products.filter((p: any) =>
    (p.name + " " + p.slug).toLowerCase().includes(search.toLowerCase())
  ), [initial.products, search]);

  function clearForm() {
    setEditingId(undefined); setName(""); setSlug(""); setDescription(""); setPrice("0");
    setTiktokUrl(""); setStatus("draft"); setFeatured(false); setCategoryIds([]);
    setImageUrls(""); setVariantsJson("[]");
  }

  function editProduct(item: any) {
    setEditingId(item.id); setName(item.name); setSlug(item.slug); setDescription(item.description);
    setPrice(String(item.basePrice)); setTiktokUrl(item.baseTiktokUrl || ""); setStatus(item.status);
    setFeatured(item.featured); setCategoryIds(item.categoryIds); setImageUrls(item.images.join("\n"));
    setVariantsJson(JSON.stringify(item.variants.map((v: any) => ({
      name: v.name, sku: v.sku, attributes: v.attributes,
      priceOverride: v.priceOverride, tiktokUrlOverride: v.tiktokUrlOverride, isActive: v.isActive,
    })), null, 2));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function uploadImages(files: File[]) {
    if (!files.length) return;
    setBusy(true);
    const added: string[] = [];
    try {
      for (const file of files) {
        const form = new FormData();
        form.append("file", file);
        const response = await fetch("/api/upload", { method: "POST", body: form });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || typeof payload.url !== "string") {
          throw new Error(typeof payload.error === "string" ? payload.error : "Không thể tải ảnh lên.");
        }
        added.push(payload.url);
      }
      setImageUrls((current) => [...current.split("\\n").map((url) => url.trim()).filter(Boolean), ...added].join("\\n"));
      toast.success(`Đã tải lên ${added.length} ảnh.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể tải ảnh lên.");
    } finally {
      setBusy(false);
    }
  }

  async function submitProduct(event: FormEvent) {
    event.preventDefault();
    let variants: any[];
    try { variants = JSON.parse(variantsJson); if (!Array.isArray(variants)) throw new Error(); }
    catch { toast.error("JSON biến thể không hợp lệ."); return; }
    setBusy(true);
    try {
      await saveProductFn({ data: {
        id: editingId, name, slug, description, basePrice: Number(price), baseTiktokUrl: tiktokUrl || null,
        status, featured, categoryIds, imageUrls: imageUrls.split("\n").map((x) => x.trim()).filter(Boolean), variants,
      }});
      toast.success("Đã lưu sản phẩm.");
      clearForm();
      await router.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể lưu sản phẩm.");
    } finally { setBusy(false); }
  }

  async function addCategory(event: FormEvent) {
    event.preventDefault(); setBusy(true);
    try {
      await saveCategoryFn({ data: { name: categoryName, description: "", isActive: true } });
      setCategoryName(""); toast.success("Đã tạo danh mục."); await router.invalidate();
    } catch { toast.error("Không thể tạo danh mục."); } finally { setBusy(false); }
  }

  async function renameCategory(item: any) {
    const nextName = window.prompt("Tên danh mục", item.name)?.trim();
    if (!nextName || nextName === item.name) return;
    setBusy(true);
    try {
      await saveCategoryFn({ data: { id: item.id, name: nextName, description: item.description || "", isActive: item.isActive } });
      toast.success("Đã cập nhật danh mục.");
      await router.invalidate();
    } catch {
      toast.error("Không thể cập nhật danh mục.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleCategory(item: any) {
    setBusy(true);
    try {
      await saveCategoryFn({ data: { id: item.id, name: item.name, description: item.description || "", isActive: !item.isActive } });
      toast.success(item.isActive ? "Đã ẩn danh mục." : "Đã hiển thị danh mục.");
      await router.invalidate();
    } catch {
      toast.error("Không thể thay đổi trạng thái danh mục.");
    } finally {
      setBusy(false);
    }
  }

  async function sendInvite(event: FormEvent) {
    event.preventDefault(); setBusy(true);
    try {
      const result = await createInvitationFn({ data: { email: inviteEmail, role: inviteRole } });
      setInviteUrl(result.url); toast.success("Đã tạo lời mời. Sao chép liên kết và gửi cho thành viên.");
      setInviteEmail(""); await router.invalidate();
    } catch { toast.error("Chỉ Owner mới có thể mời thành viên."); } finally { setBusy(false); }
  }

  async function signOut() {
    await authClient.signOut();
    await router.navigate({ to: "/" });
  }

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <Link to="/" className="brand">NOVA<span>.</span><small>CONTROL ROOM</small></Link>
        <div className="sidebar-label">WORKSPACE</div>
        <button className={tab === "products" ? "side-item active" : "side-item"} onClick={() => setTab("products")}><Package size={17}/> Sản phẩm</button>
        <button className={tab === "categories" ? "side-item active" : "side-item"} onClick={() => setTab("categories")}><FolderPlus size={17}/> Danh mục</button>
        {(isOwner || initial.role === "admin") && <button className={tab === "team" ? "side-item active" : "side-item"} onClick={() => setTab("team")}><Users size={17}/> Thành viên</button>}
        <div className="sidebar-bottom"><div className="role-chip">{initial.role.toUpperCase()}</div><button className="side-item" onClick={signOut}><LogOut size={16}/> Đăng xuất</button><Link to="/" className="store-return">← Xem cửa hàng</Link></div>
      </aside>

      <section className="admin-main">
        <header className="admin-topbar"><div><span className="eyebrow">NOVA / CONTROL ROOM</span><h1>{tab === "products" ? "Quản lý sản phẩm" : tab === "categories" ? "Danh mục" : "Thành viên & phân quyền"}</h1></div><div className="topbar-meta"><span className="live-dot"/> Neon workspace <span className="role-chip">{initial.role}</span></div></header>

        {tab === "products" && <>
          {canEdit && <form className="editor-panel" onSubmit={submitProduct}>
            <div className="panel-heading"><div><p className="eyebrow">{editingId ? "EDIT ITEM" : "CREATE ITEM"}</p><h2>{editingId ? "Cập nhật sản phẩm" : "Thêm sản phẩm mới"}</h2></div><button type="button" className="button button-quiet" onClick={clearForm}>Làm mới</button></div>
            <div className="form-grid">
              <label className="wide">Tên sản phẩm<input value={name} onChange={(e) => setName(e.target.value)} required maxLength={160}/></label>
              <label>Slug<input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="tu-dong-theo-ten"/></label>
              <label>Giá gốc (₫)<input type="number" value={price} onChange={(e) => setPrice(e.target.value)} min="0" required/></label>
              <label className="wide">Link TikTok Shop<input type="url" value={tiktokUrl} onChange={(e) => setTiktokUrl(e.target.value)} placeholder="https://www.tiktok.com/..." /></label>
              <label className="wide">Mô tả<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}/></label>
              <label>Trạng thái<select value={status} onChange={(e) => setStatus(e.target.value as any)}><option value="draft">Bản nháp</option><option value="published">Hiển thị công khai</option><option value="archived">Lưu trữ</option></select></label>
              <label className="check-label"><input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)}/> Sản phẩm nổi bật</label>
              <div className="wide">
                <label>Ảnh sản phẩm (tải trực tiếp lên Vercel Blob)
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple disabled={busy} onChange={(e) => { void uploadImages(Array.from(e.currentTarget.files ?? [])); e.currentTarget.value = ""; }}/>
                </label>
              </div>
              <label className="wide">URL ảnh bổ sung (mỗi URL một dòng)<textarea value={imageUrls} onChange={(e) => setImageUrls(e.target.value)} rows={2} placeholder="https://..."/></label>
              <label className="wide">Biến thể (JSON) — giá và TikTok URL riêng sẽ ghi đè giá/link gốc<textarea className="code-input" value={variantsJson} onChange={(e) => setVariantsJson(e.target.value)} rows={5}/></label>
              <div className="wide"><span className="field-caption">Danh mục — chọn nhiều danh mục</span><div className="category-checks">{initial.categories.map((c: any) => <label key={c.id} className="check-label"><input type="checkbox" checked={categoryIds.includes(c.id)} onChange={(e) => setCategoryIds((old) => e.target.checked ? [...old, c.id] : old.filter((id) => id !== c.id))}/>{c.name}</label>)}</div></div>
            </div>
            <div className="form-actions"><button className="button button-primary" disabled={busy}><Save size={16}/>{busy ? "Đang lưu…" : editingId ? "Cập nhật" : "Tạo sản phẩm"}</button></div>
          </form>}

          <div className="table-panel">
            <div className="panel-heading"><div><p className="eyebrow">CATALOG</p><h2>{initial.products.length} sản phẩm</h2></div><label className="search-box"><Search size={16}/><input placeholder="Tìm sản phẩm…" value={search} onChange={(e) => setSearch(e.target.value)}/></label></div>
            <div className="table-wrap"><table><thead><tr><th>Sản phẩm</th><th>Giá</th><th>Danh mục</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>
              {products.map((item: any) => <tr key={item.id}><td><strong>{item.name}</strong><small>/{item.slug}</small></td><td>{formatVnd(item.basePrice)}</td><td>{initial.categories.filter((c: any) => item.categoryIds.includes(c.id)).map((c: any) => c.name).join(", ") || "—"}</td><td><span className={"status status-" + item.status}>{item.status}</span></td><td className="table-actions">{canEdit && <button className="icon-button" onClick={() => editProduct(item)} title="Sửa">Sửa</button>}{canManage && <button className="icon-button danger" onClick={async () => { if (confirm("Xóa sản phẩm này?")) { await deleteProductFn({data:{id:item.id}}); await router.invalidate(); } }} title="Xóa"><Trash2 size={15}/></button>}{item.baseTiktokUrl && <a className="icon-button" href={item.baseTiktokUrl} target="_blank" rel="noreferrer"><ExternalLink size={15}/></a>}</td></tr>)}
              {!products.length && <tr><td colSpan={5} className="empty-cell">Chưa có sản phẩm.</td></tr>}
            </tbody></table></div>
          </div>
        </>}

        {tab === "categories" && <div className="table-panel">
          <div className="panel-heading"><div><p className="eyebrow">TAXONOMY</p><h2>Quản lý danh mục</h2></div></div>
          {canManage && <form className="inline-form" onSubmit={addCategory}><input placeholder="Tên danh mục mới" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} required maxLength={100}/><button className="button button-primary" disabled={busy}><Plus size={16}/> Thêm danh mục</button></form>}
          <div className="category-admin-list">{initial.categories.map((c: any) => <div key={c.id}><span><strong>{c.name}</strong><small>{c.slug}</small></span><span className={c.isActive ? "status status-published" : "status status-draft"}>{c.isActive ? "active" : "hidden"}</span>{canManage && <><button className="icon-button" disabled={busy} onClick={() => void renameCategory(c)}>Sửa</button><button className="icon-button" disabled={busy} onClick={() => void toggleCategory(c)}>{c.isActive ? "Ẩn" : "Hiện"}</button><button className="icon-button danger" disabled={busy} onClick={async () => { if (confirm("Xóa danh mục này?")) { await deleteCategoryFn({data:{id:c.id}}); await router.invalidate(); } }}><Trash2 size={15}/></button></>}</div>)}</div>
        </div>}

        {tab === "team" && <div className="table-panel">
          <div className="panel-heading"><div><p className="eyebrow">ACCESS CONTROL</p><h2>Thành viên & vai trò</h2></div></div>
          {isOwner && <form className="inline-form" onSubmit={sendInvite}><input type="email" placeholder="Email thành viên" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required/><select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as any)}><option value="admin">Admin</option><option value="editor">Editor</option><option value="viewer">Viewer</option></select><button className="button button-primary" disabled={busy}>Tạo lời mời</button></form>}
          {inviteUrl && <div className="invite-link"><span>{inviteUrl}</span><button className="icon-button" onClick={() => navigator.clipboard.writeText(inviteUrl)}><Copy size={15}/> Sao chép</button></div>}
          <div className="category-admin-list">{initial.members.map((member: any) => <div key={member.userId}><span><strong>{member.name}</strong><small>{member.email}</small></span>{isOwner ? <select value={member.role} onChange={async (e) => { await updateMemberRoleFn({data:{userId:member.userId,role:e.target.value as any}}); toast.success("Đã cập nhật vai trò."); await router.invalidate(); }}><option value="owner">Owner</option><option value="admin">Admin</option><option value="editor">Editor</option><option value="viewer">Viewer</option></select> : <span className="role-chip">{member.role}</span>}</div>)}</div>
        </div>}
      </section>
    </main>
  );
}
