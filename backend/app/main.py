from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy import select

from .config import Settings, get_settings
from .database import Base, build_engine, build_session_factory, get_db
from .models import User
from .routers import admin, auth, books, progress
from .security import hash_password


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    engine = build_engine(settings.database_url)
    session_factory = build_session_factory(engine)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        settings.storage_dir.mkdir(parents=True, exist_ok=True)
        Base.metadata.create_all(engine)
        with session_factory() as db:
            user = db.scalar(select(User).where(User.username == settings.superadmin_username))
            if not user:
                db.add(User(
                    username=settings.superadmin_username,
                    password_hash=hash_password(settings.superadmin_password),
                    is_admin=True,
                    is_superuser=True,
                ))
                db.commit()
        yield
        engine.dispose()

    app = FastAPI(title="Ebook Library API", lifespan=lifespan)
    app.state.settings = settings

    def session_dependency():
        with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = session_dependency
    app.include_router(auth.router, prefix="/api")
    app.include_router(admin.router, prefix="/api")
    app.include_router(books.router, prefix="/api")
    app.include_router(progress.router, prefix="/api")

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    return app


app = create_app()
