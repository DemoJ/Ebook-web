import { KeyRound, Plus, Search, UserCheck, UserX } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { adminApi } from "../api/admin";
import { Modal } from "../components/Modal";
import { EmptyState, ErrorState, getErrorMessage, LoadingState } from "../components/States";
import type { User } from "../types";

export function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<"create" | User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    adminApi.users(query)
      .then(setUsers)
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(load, [query]);

  async function toggle(user: User) {
    try {
      const updated = await adminApi.setActive(user.id, !user.is_active);
      setUsers((old) => old.map((item) => (item.id === user.id ? updated : item)));
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">ADMINISTRATION</p>
          <h1>用户管理</h1>
          <p>创建账户并维护用户的访问权限。</p>
        </div>
        <button className="button primary" onClick={() => setModal("create")}>
          <Plus />创建用户
        </button>
      </header>
      <form
        className="table-toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(search.trim());
        }}
      >
        <div className="search-input">
          <Search />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索用户名"
          />
        </div>
        <span>共 {users.length} 位用户</span>
      </form>
      {loading ? (
        <LoadingState />
      ) : error && !users.length ? (
        <ErrorState message={error} retry={load} />
      ) : !users.length ? (
        <EmptyState title="没有找到用户" text="调整关键词后重新搜索。" />
      ) : (
        <div className="data-table">
          <div className="table-head">
            <span>用户</span>
            <span>角色</span>
            <span>状态</span>
            <span>创建时间</span>
            <span>操作</span>
          </div>
          {users.map((user) => (
            <div className="table-row" key={user.id}>
              <span className="user-cell">
                <i>{user.username.slice(0, 1).toUpperCase()}</i>
                <span>
                  <b>{user.username}</b>
                  <small>@{user.username}</small>
                </span>
              </span>
              <span>
                <em className={`badge ${user.is_admin ? "admin" : "user"}`}>
                  {user.is_superuser ? "超级管理员" : user.is_admin ? "管理员" : "用户"}
                </em>
              </span>
              <span>
                <em className={`status ${user.is_active ? "enabled" : "disabled"}`}>
                  {user.is_active ? "正常" : "已禁用"}
                </em>
              </span>
              <span>{new Date(user.created_at).toLocaleDateString("zh-CN")}</span>
              <span className="table-actions">
                <button className="icon-button" title="重置密码" onClick={() => setModal(user)}>
                  <KeyRound />
                </button>
                <button
                  className={`icon-button ${user.is_active ? "danger" : ""}`}
                  title={user.is_active ? "禁用" : "启用"}
                  onClick={() => toggle(user)}
                  disabled={user.is_superuser}
                >
                  {user.is_active ? <UserX /> : <UserCheck />}
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
      {modal === "create" && (
        <CreateUserModal
          onClose={() => setModal(null)}
          onDone={() => {
            setModal(null);
            load();
          }}
        />
      )}
      {modal && modal !== "create" && (
        <ResetPasswordModal user={modal} onClose={() => setModal(null)} />
      )}
    </div>
  );
}

function CreateUserModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [value, setValue] = useState({ username: "", password: "", is_admin: false });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await adminApi.createUser(value);
      onDone();
    } catch (err) {
      setError(getErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Modal title="创建用户" onClose={onClose}>
      <form className="form-stack" onSubmit={submit}>
        {error && <div className="form-error">{error}</div>}
        <label>
          用户名
          <input
            value={value.username}
            onChange={(e) => setValue({ ...value, username: e.target.value })}
            required
          />
        </label>
        <label>
          初始密码
          <input
            type="password"
            minLength={8}
            value={value.password}
            onChange={(e) => setValue({ ...value, password: e.target.value })}
            required
          />
        </label>
        <label>
          角色
          <select
            value={value.is_admin ? "admin" : "user"}
            onChange={(e) => setValue({ ...value, is_admin: e.target.value === "admin" })}
          >
            <option value="user">普通用户</option>
            <option value="admin">管理员</option>
          </select>
        </label>
        <footer className="form-actions">
          <button type="button" className="button secondary" onClick={onClose}>取消</button>
          <button className="button primary" disabled={busy}>创建账户</button>
        </footer>
      </form>
    </Modal>
  );
}

function ResetPasswordModal({ user, onClose }: { user: User; onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      await adminApi.resetPassword(user.id, password);
      setDone(true);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <Modal title="重置密码" onClose={onClose}>
      {done ? (
        <div className="modal-result">
          <UserCheck />
          <h3>密码已重置</h3>
          <button className="button primary" onClick={onClose}>完成</button>
        </div>
      ) : (
        <form className="form-stack" onSubmit={submit}>
          <p>
            为 <b>{user.username}</b> 设置一个新的登录密码。
          </p>
          {error && <div className="form-error">{error}</div>}
          <label>
            新密码
            <input
              autoFocus
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <footer className="form-actions">
            <button type="button" className="button secondary" onClick={onClose}>取消</button>
            <button className="button primary">确认重置</button>
          </footer>
        </form>
      )}
    </Modal>
  );
}
