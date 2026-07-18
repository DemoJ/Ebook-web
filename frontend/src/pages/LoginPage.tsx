import { BookOpen, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getErrorMessage } from "../components/States";

export function LoginPage() {
  const { user, login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  if (user) return <Navigate to="/shelf" replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      await login(username.trim(), password);
      const from = (location.state as { from?: { pathname?: string } })?.from?.pathname;
      navigate(from || "/shelf", { replace: true });
    } catch (nextError) { setError(getErrorMessage(nextError)); }
    finally { setBusy(false); }
  }

  return <main className="login-page">
    <section className="login-story">
      <div className="login-brand"><span><BookOpen /></span><b>LeafRead</b></div>
      <div className="story-copy"><p className="eyebrow">A ROOM FOR READING</p><h1>每一本书，<br />都值得一处安静的所在。</h1><p>收藏你的阅读轨迹，在字里行间继续上次未完的旅程。</p></div>
      <blockquote>“我们读书，然后觉得自己并不孤单。”<cite>— C. S. Lewis</cite></blockquote>
    </section>
    <section className="login-form-wrap"><form className="login-form" onSubmit={submit}>
      <header><p className="eyebrow">WELCOME BACK</p><h2>回到你的书房</h2><span>使用账户登录以继续阅读</span></header>
      {error && <div className="form-error">{error}</div>}
      <label>用户名<input autoFocus autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="请输入用户名" required /></label>
      <label>密码<div className="password-input"><input type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="请输入密码" required /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="显示或隐藏密码">{showPassword ? <EyeOff /> : <Eye />}</button></div></label>
      <button className="button primary wide" disabled={busy}>{busy ? <><LoaderCircle className="spin" />正在登录</> : "进入书房"}</button>
      <small className="login-note">账户由管理员统一创建。如需访问，请联系管理员。</small>
    </form></section>
  </main>;
}
