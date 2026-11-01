import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { checkInvitation } from "@/lib/access";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/invite/$token")({
  loader: ({ params }) => checkInvitation({ data: { token: params.token } }),
  component: InvitePage,
});

function InvitePage() {
  const { token } = Route.useParams();
  const invite = Route.useLoaderData();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function accept(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const result = await authClient.signUp.email({
      name: name.trim(),
      email: invite.valid ? invite.email : "",
      username: username.trim().toLowerCase(),
      password,
      inviteToken: token,
      callbackURL: "/admin",
    });
    setBusy(false);
    if (result.error) {
      toast.error(result.error.message || "Không thể tạo tài khoản từ lời mời này.");
      return;
    }
    await navigate({ to: "/admin", replace: true });
  }

  return (
    <main className="invite-shell">
      <section className="invite-card">
        <Link to="/" className="back-link">← NOVA STORE</Link>
        <div className="auth-brand">NOVA<span>.</span></div>
        <p className="eyebrow">LỜI MỜI THÀNH VIÊN</p>
        {invite.valid ? (
          <>
            <h1>Hoàn tất tài khoản</h1>
            <p className="muted">Lời mời dành cho <strong>{invite.email}</strong>, vai trò <strong>{invite.role}</strong>.</p>
            <form className="form-stack" onSubmit={accept}>
              <label>Tên hiển thị<input value={name} onChange={(e) => setName(e.target.value)} required maxLength={100}/></label>
              <label>Username<input value={username} onChange={(e) => setUsername(e.target.value)} required minLength={3} maxLength={30} pattern="[a-zA-Z0-9_]+"/></label>
              <label>Mật khẩu<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={10} maxLength={128}/></label>
              <button className="button button-primary" disabled={busy}>{busy ? "Đang tạo tài khoản…" : "Chấp nhận lời mời"}</button>
            </form>
          </>
        ) : (
          <>
            <h1>Lời mời không hợp lệ</h1>
            <p className="muted">Liên kết đã hết hạn, đã được sử dụng hoặc không tồn tại. Hãy yêu cầu Owner tạo lời mời mới.</p>
            <Link to="/auth" className="button button-primary">Đi tới đăng nhập</Link>
          </>
        )}
      </section>
    </main>
  );
}
