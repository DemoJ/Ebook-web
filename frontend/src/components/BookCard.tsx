import { ArrowRight, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import type { Book } from "../types";
import { BookCover } from "./BookCover";

export function BookCard({ book, onAdd }: { book: Book; onAdd?: (book: Book) => void }) {
  const progress = Math.round(book.progress?.percentage || 0);
  return (
    <article className="book-card">
      <Link to={`/reader/${book.id}`} className="cover-link">
        <BookCover book={book} />
      </Link>
      <div className="book-card-body">
        <div>
          <h3 title={book.title}>{book.title}</h3>
          <p>{book.author || "未知作者"}</p>
        </div>
        {book.progress && (
          <div className="progress-wrap">
            <div className="progress-label">
              <span>已读</span>
              <b>{progress}%</b>
            </div>
            <div className="progress">
              <i style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
        <div className="book-actions">
          <Link className="text-link" to={`/reader/${book.id}`}>
            {progress > 0 ? "继续阅读" : "开始阅读"}
            <ArrowRight size={15} />
          </Link>
          {onAdd && (
            <button
              className="icon-button small"
              onClick={() => onAdd(book)}
              disabled={!!book.in_shelf}
              title={book.in_shelf ? "已在书架" : "加入书架"}
            >
              <Plus />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
