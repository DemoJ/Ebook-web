import { BookOpen } from "lucide-react";
import { useState } from "react";
import type { Book } from "../types";

const colors = ["ochre", "forest", "ink", "clay", "plum"];

export function BookCover({ book, compact = false }: { book: Book; compact?: boolean }) {
  const color = colors[(book.title.charCodeAt(0) || 0) % colors.length];
  const coverSrc = book.cover_url || (book.has_cover ? `/api/books/${book.id}/cover` : null);
  const [failed, setFailed] = useState(false);

  return (
    <div className={`book-cover ${color} ${compact ? "compact" : ""}`}>
      {coverSrc && !failed ? (
        <img src={coverSrc} alt={`${book.title}封面`} onError={() => setFailed(true)} />
      ) : (
        <>
          <span className="cover-rule" />
          <BookOpen size={compact ? 18 : 24} />
          <strong>{book.title}</strong>
          <small>{book.author || "佚名"}</small>
        </>
      )}
    </div>
  );
}
