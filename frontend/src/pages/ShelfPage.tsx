import { Compass } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { booksApi } from "../api/books";
import { BookCard } from "../components/BookCard";
import { EmptyState, ErrorState, getErrorMessage, LoadingState } from "../components/States";
import type { Book } from "../types";

export function ShelfPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    booksApi.shelf()
      .then(setBooks)
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const active = books.filter((book) => {
    const percentage = book.progress?.percentage || 0;
    return percentage > 0 && percentage < 99;
  });

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">MY READING ROOM</p>
          <h1>我的书架</h1>
          <p>所有读过的篇章，都在这里留下书签。</p>
        </div>
        <Link className="button secondary" to="/shared">
          <Compass />发现更多书籍
        </Link>
      </header>
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} retry={load} />
      ) : books.length === 0 ? (
        <EmptyState
          title="书架还是空的"
          text="去共享书库发现一本好书，或上传自己的 EPUB。"
          action={<Link className="button primary" to="/shared">浏览共享书库</Link>}
        />
      ) : (
        <>
          {active.length > 0 && (
            <section className="section">
              <div className="section-heading">
                <h2>继续阅读</h2>
                <span>{active.length} 本正在阅读</span>
              </div>
              <div className="book-grid featured">
                {active.slice(0, 4).map((book) => <BookCard key={book.id} book={book} />)}
              </div>
            </section>
          )}
          <section className="section">
            <div className="section-heading">
              <h2>全部藏书</h2>
              <span>共 {books.length} 本</span>
            </div>
            <div className="book-grid">
              {books.map((book) => <BookCard key={book.id} book={book} />)}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
