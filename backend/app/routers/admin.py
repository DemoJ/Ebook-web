from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, or_, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Book, User, shelf_books
from ..schemas import BookOut, BookUpdate, PasswordReset, UserCreate, UserOut, UserUpdate
from ..security import admin_user, hash_password
from ..serializers import owner_names, serialize_book

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(admin_user)])


@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    if db.scalar(select(User).where(User.username == payload.username)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Username already exists")
    user = User(
        username=payload.username,
        password_hash=hash_password(payload.password),
        is_admin=payload.is_admin,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/users", response_model=list[UserOut])
def list_users(q: str | None = None, db: Session = Depends(get_db)):
    query = select(User).order_by(User.id)
    if q:
        query = query.where(User.username.ilike(f"%{q}%"))
    return list(db.scalars(query).all())


@router.patch("/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    payload: UserUpdate,
    actor: User = Depends(admin_user),
    db: Session = Depends(get_db),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    if user.is_superuser and not payload.is_active:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Super administrator cannot be disabled")
    if user.id == actor.id and not payload.is_active:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cannot disable your own account")
    user.is_active = payload.is_active
    db.commit()
    return user


@router.post("/users/{user_id}/reset-password", status_code=status.HTTP_204_NO_CONTENT)
def reset_password(
    user_id: int,
    payload: PasswordReset,
    actor: User = Depends(admin_user),
    db: Session = Depends(get_db),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    if user.is_superuser and not actor.is_superuser:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only a super administrator can reset this password")
    user.password_hash = hash_password(payload.new_password)
    db.commit()


@router.get("/books", response_model=list[BookOut])
def list_all_books(q: str | None = None, db: Session = Depends(get_db)):
    query = select(Book).order_by(Book.created_at.desc())
    if q:
        query = query.where(or_(Book.title.ilike(f"%{q}%"), Book.author.ilike(f"%{q}%")))
    books = list(db.scalars(query).all())
    names = owner_names(db, books)
    return [serialize_book(book, owner_name=names.get(book.owner_id)) for book in books]


@router.patch("/books/{book_id}", response_model=BookOut)
def manage_book(book_id: int, payload: BookUpdate, db: Session = Depends(get_db)):
    book = db.get(Book, book_id)
    if not book:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Book not found")
    for name, value in payload.model_dump(exclude_unset=True).items():
        setattr(book, name, value)
    if book.visibility == "private":
        db.execute(
            delete(shelf_books).where(
                shelf_books.c.book_id == book.id,
                shelf_books.c.user_id != book.owner_id,
            )
        )
    db.commit()
    db.refresh(book)
    names = owner_names(db, [book])
    return serialize_book(book, owner_name=names.get(book.owner_id))


@router.post("/books/{book_id}/take-down", response_model=BookOut)
def take_down(book_id: int, db: Session = Depends(get_db)):
    book = db.get(Book, book_id)
    if not book:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Book not found")
    book.status = "taken_down"
    db.execute(
        delete(shelf_books).where(
            shelf_books.c.book_id == book.id,
            shelf_books.c.user_id != book.owner_id,
        )
    )
    db.commit()
    db.refresh(book)
    names = owner_names(db, [book])
    return serialize_book(book, owner_name=names.get(book.owner_id))


@router.post("/books/{book_id}/restore", response_model=BookOut)
def restore(book_id: int, db: Session = Depends(get_db)):
    book = db.get(Book, book_id)
    if not book:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Book not found")
    book.status = "active"
    db.commit()
    db.refresh(book)
    names = owner_names(db, [book])
    return serialize_book(book, owner_name=names.get(book.owner_id))
