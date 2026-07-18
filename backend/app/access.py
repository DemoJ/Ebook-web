from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from .models import Book, User


def get_book_or_404(db: Session, book_id: int) -> Book:
    book = db.get(Book, book_id)
    if not book:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Book not found")
    return book


def can_read(db: Session, user: User, book: Book) -> bool:
    if book.owner_id == user.id:
        return book.status in {"active", "taken_down"}
    if book.status != "active":
        return False
    if book.visibility == "shared":
        return True
    return False


def require_read(db: Session, user: User, book: Book) -> None:
    if not can_read(db, user, book):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Book is not available to this user")
