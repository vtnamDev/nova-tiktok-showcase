import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowLeft, LockKeyhole, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    next: typeof search.next === "string" && search.next.startsWith("/") && !search.next.startsWith("//") ? search.next : "/admin",
  }),
  component: AuthPage,
});

function AuthPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const session = authClient.useSession();

  async function login(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const result = await authClient.signIn.username({ username: username.trim().toLowerCase(), password });
    setBusy(false);
    if (result.error) {
      toast.error("Tên đăng nhập hoặc mật khẩu không đúng.");
      return;
    }
    await navigate({ to: next, replace: true });
  }

  async function google() {
    setBusy(true);
    const result = await authClient.signIn.social({ provider: "google", callbackURL: next });
    if (result.error) {
      setBusy(false);
      toast.error("Không thể đăng nhập Google. Kiểm tra cấu hình OAuth.");
    }
  }

  async function linkGoogle() {
    const result = await authClient.linkSocial({ provider: "google", callbackURL: "/admin" });
    if (result.error) toast.error("Không thể liên kết Google.");
  }

  return (
    <main className="auth-layout">
      <section className="auth-panel">
        <Link to="/" className="back-link"><ArrowLeft size={16}/> Về cửa hàng</Link>
        <div className="auth-brand">NOVA<span>.</span></div>
        <div className="auth-lock"><LockKeyhole size={22}/></div>
        <p className="eyebrow">KHU VỰC QUẢN TRỊ</p>
        <h1>Đăng nhập hệ thống</h1>
        <p className="muted">Tài khoản quản trị được cấp qua lời mời của Owner. Khách hàng không cần đăng nhập để xem sản phẩm.</p>

        {session.data?.user ? (
          <div className="auth-success">
            <ShieldCheck size={22}/>
            <p>Đang đăng nhập bằng {session.data.user.email}.</p>
            <button className="button button-primary" onClick={() => navigate({ to: "/admin" })}>Mở trang quản trị</button>
            <button className="button button-quiet" onClick={linkGoogle}>Liên kết Google với tài khoản này</button>
          </div>
        ) : (
          <>
            <button className="button button-google" disabled={busy} onClick={google}>
              <span className="google-mark">G</span> Tiếp tục với Google
            </button>
            <div className="auth-divider"><span>hoặc đăng nhập bằng username</span></div>
            <form onSubmit={login} className="form-stack">
              <label>Tên đăng nhập
                <input autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required minLength={3} maxLength={30} />
              </label>
              <label>Mật khẩu
                <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={10} maxLength={128} />
              </label>
              <button className="button button-primary" disabled={busy}>{busy ? "Đang xác thực…" : "Đăng nhập"}</button>
            </form>
            <p className="auth-footnote">Chỉ người có lời mời hợp lệ mới tạo được tài khoản. Cần tài khoản? Liên hệ Owner để nhận liên kết mời.</p>
          </>
        )}
      </section>
      <aside className="auth-aside">
        <div className="orb orb-one"/><div className="orb orb-two"/>
        <span className="eyebrow">NOVA COMMERCE</span>
        <h2>Một nơi quản lý.<br/><em>Mọi ngành hàng.</em></h2>
        <p>Danh mục linh hoạt, biến thể sản phẩm và đường dẫn TikTok Shop được quản lý tập trung.</p>
        <div className="auth-stats"><div><strong>01</strong><span>Product catalog</span></div><div><strong>04</strong><span>Permission levels</span></div></div>
      </aside>
    </main>
  );
}
