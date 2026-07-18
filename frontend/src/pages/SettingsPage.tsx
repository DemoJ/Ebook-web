import { CheckCircle2, KeyRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { authApi } from "../api/auth";
import { useAuth } from "../auth/AuthContext";
import { getErrorMessage } from "../components/States";

export function SettingsPage() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setError("");
    if (newPassword.length < 8) {
      setError("新密码至少需要 8 个字符");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("两次输入的新密码不一致");
      return;
    }
    setBusy(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setMessage("密码已更新");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page narrow-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">ACCOUNT & SECURITY</p>
          <h1>个人设置</h1>
          <p>管理账户身份与登录安全。</p>
        </div>
      </header>
      <section className="settings-card profile-card">
        <div className="large-avatar">{user?.username.slice(0, 1).toUpperCase()}</div>
        <div>
          <h2>{user?.username}</h2>
          <p>@{user?.username} · {user?.is_admin ? "管理员" : "普通用户"}</p>
        </div>
      </section>
      <section className="settings-card">
        <header className="card-title">
          <span><KeyRound /></span>
          <div>
            <h2>修改密码</h2>
            <p>建议使用至少 8 位且不易猜测的密码。</p>
          </div>
        </header>
        <form className="form-stack password-form" onSubmit={submit}>
          {error && <div className="form-error">{error}</div>}
          {message && (
            <div className="form-success">
              <CheckCircle2 />
              {message}
            </div>
          )}
          <label>
            当前密码
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </label>
          <label>
            新密码
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </label>
          <label>
            确认新密码
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </label>
          <button className="button primary" disabled={busy}>
            {busy ? "正在更新…" : "更新密码"}
          </button>
        </form>
      </section>
    </div>
  );
}
