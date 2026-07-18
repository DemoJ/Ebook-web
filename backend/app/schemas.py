from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class LoginRequest(BaseModel):
    username: str
    password: str


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=200)


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=80, pattern=r"^[A-Za-z0-9_.-]+$")
    password: str = Field(min_length=8, max_length=200)
    is_admin: bool = False


class UserUpdate(BaseModel):
    is_active: bool


class PasswordReset(BaseModel):
    new_password: str = Field(min_length=8, max_length=200)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    is_admin: bool
    is_superuser: bool
    is_active: bool
    created_at: datetime


class BookUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=300)
    author: str | None = Field(default=None, min_length=1, max_length=300)
    visibility: str | None = Field(default=None, pattern="^(private|shared)$")


class ProgressOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    book_id: int
    location: str
    percentage: float
    chapter: str | None
    updated_at: datetime


class BookOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_id: int
    owner_name: str | None = None
    title: str
    author: str
    visibility: str
    status: str
    original_filename: str
    has_cover: bool = False
    cover_url: str | None = None
    in_shelf: bool | None = None
    progress: ProgressOut | None = None
    created_at: datetime
    updated_at: datetime


class ProgressUpdate(BaseModel):
    location: str = Field(min_length=1, max_length=5000)
    percentage: float = Field(ge=0, le=100)
    chapter: str | None = Field(default=None, max_length=500)
