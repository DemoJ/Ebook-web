from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import delete, or_, select
from sqlalchemy.orm import Session

from ..access import get_book_or_404, require_read
from ..database import get_db
from ..epub import inspect_epub
from ..models import Book, User, shelf_books
from ..schemas import BookOut, BookUpdate
from ..security import current_user
from ..serializers import owner_names, progress_map, serialize_book, shelf_ids

router = APIRouter(prefix="/books", tags=["books"])


def _search(query, q: str | None):
    if q:
        query = query.where(or_(Book.title.ilike(f"%{q}%"), Book.author.ilike(f"%{q}%")))
    return query.order_by(Book.created_at.desc())


def _serialize_many(db: Session, books: list[Book], user: User, *, with_progress=False, with_shelf=False):
    names = owner_names(db, books)
    ids = [book.id for book in books]
    shelves = shelf_ids(db, user.id, ids) if with_shelf else set()
    progresses = progress_map(db, user.id, ids) if with_progress else {}
    return [
        serialize_book(
            book,
            owner_name=names.get(book.owner_id),
            in_shelf=(book.id in shelves) if with_shelf else None,
            progress=progresses.get(book.id) if with_progress else None,
        )
        for book in books
    ]


@router.post("", response_model=BookOut, status_code=status.HTTP_201_CREATED)
async def upload_book(
    request: Request,
    file: UploadFile = File(...),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    if Path(file.filename or "").suffix.lower() != ".epub":
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Only .epub files are accepted")
    settings = request.app.state.settings
    data = await file.read(settings.max_upload_bytes + 1)
    if len(data) > settings.max_upload_bytes:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "EPUB file is too large")
    metadata = inspect_epub(data, settings)
    key = uuid4().hex
    book_dir = settings.storage_dir / key
    book_dir.mkdir(parents=True)
    epub_path = book_dir / "book.epub"
    epub_path.write_bytes(data)
    cover_path = None
    if metadata.cover:
        extension = metadata.cover_extension if metadata.cover_extension in {".jpg", ".jpeg", ".png", ".webp", ".gif"} else ".img"
        cover_file = book_dir / f"cover{extension}"
        cover_file.write_bytes(metadata.cover)
        cover_path = str(cover_file.resolve())
    book = Book(
        owner_id=user.id,
        title=metadata.title,
        author=metadata.author,
        file_path=str(epub_path.resolve()),
        cover_path=cover_path,
        original_filename=Path(file.filename or "book.epub").name[:300],
    )
    db.add(book)
    db.flush()
    db.execute(shelf_books.insert().values(user_id=user.id, book_id=book.id))
    db.commit()
    db.refresh(book)
    return serialize_book(book, owner_name=user.username, in_shelf=True)


@router.get("/mine", response_model=list[BookOut])
def my_uploads(q: str | None = None, user: User = Depends(current_user), db: Session = Depends(get_db)):
    books = list(db.scalars(_search(select(Book).where(Book.owner_id == user.id), q)).all())
    return _serialize_many(db, books, user, with_progress=True, with_shelf=True)


@router.get("/shelf", response_model=list[BookOut])
def my_shelf(q: str | None = None, user: User = Depends(current_user), db: Session = Depends(get_db)):
    query = select(Book).join(shelf_books).where(shelf_books.c.user_id == user.id, Book.status == "active")
    books = list(db.scalars(_search(query, q)).all())
    return _serialize_many(db, books, user, with_progress=True, with_shelf=True)


@router.get("/shared", response_model=list[BookOut])
def shared_library(q: str | None = None, user: User = Depends(current_user), db: Session = Depends(get_db)):
    query = select(Book).where(Book.visibility == "shared", Book.status == "active")
    books = list(db.scalars(_search(query, q)).all())
    return _serialize_many(db, books, user, with_progress=True, with_shelf=True)


@router.get("/{book_id}", response_model=BookOut)
def get_book(book_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    book = get_book_or_404(db, book_id)
    require_read(db, user, book)
    names = owner_names(db, [book])
    shelves = shelf_ids(db, user.id, [book.id])
    progresses = progress_map(db, user.id, [book.id])
    return serialize_book(
        book,
        owner_name=names.get(book.owner_id),
        in_shelf=book.id in shelves,
        progress=progresses.get(book.id),
    )


@router.put("/{book_id}", response_model=BookOut)
def update_book(book_id: int, payload: BookUpdate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    book = get_book_or_404(db, book_id)
    if book.owner_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the owner can edit this book")
    for name, value in payload.model_dump(exclude_unset=True).items():
        setattr(book, name, value)
    if book.visibility == "private":
        db.execute(
            delete(shelf_books).where(
                shelf_books.c.book_id == book.id,
                shelf_books.c.user_id != user.id,
            )
        )
    db.commit()
    db.refresh(book)
    return serialize_book(book, owner_name=user.username, in_shelf=True)


@router.delete("/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_book(book_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    book = get_book_or_404(db, book_id)
    if book.owner_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the owner can delete this book")
    paths = [Path(path) for path in (book.file_path, book.cover_path) if path]
    parent = paths[0].parent if paths else None
    db.delete(book)
    db.commit()
    for path in paths:
        path.unlink(missing_ok=True)
    if parent and parent.exists():
        try:
            parent.rmdir()
        except OSError:
            pass


@router.post("/{book_id}/shelf", status_code=status.HTTP_204_NO_CONTENT)
def add_to_shelf(book_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    book = get_book_or_404(db, book_id)
    if book.owner_id == user.id:
        return
    if book.visibility != "shared" or book.status != "active":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only active shared books can be added")
    exists = db.scalar(
        select(shelf_books.c.book_id).where(
            shelf_books.c.user_id == user.id,
            shelf_books.c.book_id == book.id,
        )
    )
    if not exists:
        db.execute(shelf_books.insert().values(user_id=user.id, book_id=book.id))
        db.commit()


@router.delete("/{book_id}/shelf", status_code=status.HTTP_204_NO_CONTENT)
def remove_from_shelf(book_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    book = get_book_or_404(db, book_id)
    if book.owner_id == user.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cannot remove your own upload from the shelf")
    db.execute(delete(shelf_books).where(shelf_books.c.user_id == user.id, shelf_books.c.book_id == book_id))
    db.commit()


@router.get("/{book_id}/file")
def book_file(book_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    book = get_book_or_404(db, book_id)
    require_read(db, user, book)
    return FileResponse(book.file_path, media_type="application/epub+zip", filename=book.original_filename)


@router.get("/{book_id}/cover")
def book_cover(book_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    book = get_book_or_404(db, book_id)
    require_read(db, user, book)
    if not book.cover_path:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Book has no cover")
    return FileResponse(book.cover_path)
