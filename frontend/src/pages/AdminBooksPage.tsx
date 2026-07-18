import { RotateCcw, Search, ShieldOff } from "lucide-react";
import { useEffect, useState } from "react";
import { adminApi } from "../api/admin";
import { BookCover } from "../components/BookCover";
import { EmptyState, ErrorState, getErrorMessage, LoadingState } from "../components/States";
import type { Book } from "../types";

export function AdminBooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    adminApi.books(query)
      .then(setBooks)
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(load, [query]);

  async function takeDown(book: Book) {
    if (!confirm(`确定下架《${book.title}》吗？其他用户将无法继续阅读。`)) return;
    try {
      const updated = await adminApi.takeDown(book.id);
      setBooks((old) => old.map((item) => (item.id === book.id ? updated : item)));
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  async function restore(book: Book) {
    try {
      const updated = await adminApi.restore(book.id);
      setBooks((old) => old.map((item) => (item.id === book.id ? updated : item)));
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">CONTENT GOVERNANCE</p>
          <h1>书籍治理</h1>
          <p>审阅全站书籍，并处理不适宜的内容。</p>
        </div>
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
            placeholder="搜索书名或作者"
          />
        </div>
        <span>共 {books.length} 本书</span>
      </form>
      {error && (
        <div className="inline-error">
          {error}
          <button onClick={() => setError("")}>关闭</button>
        </div>
      )}
      {loading ? (
        <LoadingState />
      ) : error && !books.length ? (
        <ErrorState message={error} retry={load} />
      ) : !books.length ? (
        <EmptyState title="没有找到书籍" text="调整关键词后重新搜索。" />
      ) : (
        <div className="governance-list">
          {books.map((book) => (
            <article key={book.id}>
              <BookCover book={book} compact />
              <div>
                <h3>{book.title}</h3>
                <p>{book.author || "未知作者"}</p>
                <span>
                  上传者：{book.owner_name || "未知"} · {book.visibility === "shared" ? "共享" : "私人"}
                  {" · "}
                  {book.status === "taken_down" ? "已下架" : "正常"}
                </span>
              </div>
              <time>{new Date(book.created_at).toLocaleDateString("zh-CN")}</time>
              {book.status === "taken_down" ? (
                <button className="button ghost" onClick={() => restore(book)}>
                  <RotateCcw />恢复
                </button>
              ) : (
                <button className="button ghost danger" onClick={() => takeDown(book)}>
                  <ShieldOff />下架
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
