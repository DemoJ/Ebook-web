from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..access import get_book_or_404, require_read
from ..database import get_db
from ..models import ReadingProgress, User
from ..schemas import ProgressOut, ProgressUpdate
from ..security import current_user

router = APIRouter(prefix="/books/{book_id}/progress", tags=["progress"])


@router.get("", response_model=ProgressOut)
def get_progress(book_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    book = get_book_or_404(db, book_id)
    require_read(db, user, book)
    progress = db.scalar(select(ReadingProgress).where(ReadingProgress.user_id == user.id, ReadingProgress.book_id == book_id))
    if not progress:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reading progress not found")
    return progress


@router.put("", response_model=ProgressOut)
def save_progress(
    book_id: int,
    payload: ProgressUpdate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    book = get_book_or_404(db, book_id)
    require_read(db, user, book)
    progress = db.scalar(select(ReadingProgress).where(ReadingProgress.user_id == user.id, ReadingProgress.book_id == book_id))
    if not progress:
        progress = ReadingProgress(user_id=user.id, book_id=book_id, **payload.model_dump())
        db.add(progress)
    else:
        for name, value in payload.model_dump().items():
            setattr(progress, name, value)
    db.commit()
    db.refresh(progress)
    return progress
