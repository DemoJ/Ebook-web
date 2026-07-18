from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Book, ReadingProgress, User, shelf_books
from .schemas import BookOut, ProgressOut


def serialize_book(
    book: Book,
    *,
    owner_name: str | None = None,
    in_shelf: bool | None = None,
    progress: ReadingProgress | None = None,
) -> BookOut:
    has_cover = bool(book.cover_path)
    return BookOut(
        id=book.id,
        owner_id=book.owner_id,
        owner_name=owner_name,
        title=book.title,
        author=book.author,
        visibility=book.visibility,
        status=book.status,
        original_filename=book.original_filename,
        has_cover=has_cover,
        cover_url=f"/api/books/{book.id}/cover" if has_cover else None,
        in_shelf=in_shelf,
        progress=ProgressOut.model_validate(progress) if progress else None,
        created_at=book.created_at,
        updated_at=book.updated_at,
    )


def owner_names(db: Session, books: list[Book]) -> dict[int, str]:
    owner_ids = {book.owner_id for book in books}
    if not owner_ids:
        return {}
    users = db.scalars(select(User).where(User.id.in_(owner_ids))).all()
    return {user.id: user.username for user in users}


def shelf_ids(db: Session, user_id: int, book_ids: list[int]) -> set[int]:
    if not book_ids:
        return set()
    rows = db.execute(
        select(shelf_books.c.book_id).where(
            shelf_books.c.user_id == user_id,
            shelf_books.c.book_id.in_(book_ids),
        )
    ).all()
    return {row[0] for row in rows}


def progress_map(db: Session, user_id: int, book_ids: list[int]) -> dict[int, ReadingProgress]:
    if not book_ids:
        return {}
    rows = db.scalars(
        select(ReadingProgress).where(
            ReadingProgress.user_id == user_id,
            ReadingProgress.book_id.in_(book_ids),
        )
    ).all()
    return {row.book_id: row for row in rows}
