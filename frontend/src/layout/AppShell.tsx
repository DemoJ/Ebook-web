import { BookCopy, Compass, Library, LogOut, Menu, Settings, Shield, Upload, X } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const links = [
  { to: "/shelf", label: "我的书架", icon: Library },
  { to: "/uploads", label: "我的上传", icon: Upload },
  { to: "/shared", label: "共享书库", icon: Compass },
  { to: "/settings", label: "个人设置", icon: Settings },
];

export function AppShell() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function signOut() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="app-shell">
      <button className="mobile-menu" onClick={() => setOpen(!open)} aria-label="打开菜单">
        {open ? <X /> : <Menu />}
      </button>
      {open && <div className="nav-scrim" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <NavLink to="/shelf" className="brand" onClick={() => setOpen(false)}>
          <span><BookCopy /></span>
          <div>
            <b>LeafRead</b>
            <small>阅读，自有其境</small>
          </div>
        </NavLink>
        <nav>
          <p className="nav-label">你的阅读空间</p>
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)}>
              <Icon />
              {label}
            </NavLink>
          ))}
          {user?.is_admin && (
            <>
              <p className="nav-label">管理</p>
              <NavLink to="/admin/users" onClick={() => setOpen(false)}>
                <Shield />用户管理
              </NavLink>
              <NavLink to="/admin/books" onClick={() => setOpen(false)}>
                <BookCopy />书籍治理
              </NavLink>
            </>
          )}
        </nav>
        <div className="user-panel">
          <div className="avatar">{user?.username?.slice(0, 1).toUpperCase() || "读"}</div>
          <div>
            <b>{user?.username}</b>
            <small>{user?.is_admin ? "管理员" : `@${user?.username}`}</small>
          </div>
          <button className="icon-button" onClick={signOut} title="退出登录">
            <LogOut />
          </button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
