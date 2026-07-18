import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { booksApi } from "../api/books";
import { BookCard } from "../components/BookCard";
import { EmptyState, ErrorState, getErrorMessage, LoadingState } from "../components/States";
import type { Book } from "../types";

export function SharedLibraryPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    booksApi.shared(query)
      .then(setBooks)
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [query]);

  async function add(book: Book) {
    try {
      await booksApi.addToShelf(book.id);
      setBooks((old) => old.map((item) => (item.id === book.id ? { ...item, in_shelf: true } : item)));
      setNotice(`《${book.title}》已加入书架`);
      setTimeout(() => setNotice(""), 2500);
    } catch (e) {
      setNotice(getErrorMessage(e));
    }
  }

  return (
    <div className="page">
      <header className="page-header library-header">
        <div>
          <p className="eyebrow">COMMUNITY LIBRARY</p>
          <h1>共享书库</h1>
          <p>从他人的收藏里，遇见下一本想读的书。</p>
        </div>
        <form
          className="search-box"
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(search.trim());
          }}
        >
          <Search />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索书名或作者"
          />
          <button>搜索</button>
        </form>
      </header>
      {notice && <div className="toast">{notice}</div>}
      {loading ? (
        <LoadingState label="正在浏览共享书库…" />
      ) : error ? (
        <ErrorState message={error} retry={() => setQuery(query)} />
      ) : books.length === 0 ? (
        <EmptyState
          title={query ? "没有找到匹配的书" : "共享书库还是空的"}
          text={query ? "换个书名或作者关键词试试。" : "等待第一本共享书籍出现。"}
        />
      ) : (
        <section className="section">
          <div className="section-heading">
            <h2>{query ? `“${query}” 的结果` : "最近共享"}</h2>
            <span>共 {books.length} 本</span>
          </div>
          <div className="book-grid">
            {books.map((book) => <BookCard key={book.id} book={book} onAdd={add} />)}
          </div>
        </section>
      )}
    </div>
  );
}
