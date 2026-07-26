"""
Database configuration and session management
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Database URL (supports SQLite or external DB via DATABASE_URL)
def get_database_url() -> str:
    """Return a usable database URL, falling back to SQLite when unset or blank."""
    raw_url = os.getenv("DATABASE_URL", "").strip()
    if not raw_url:
        return "sqlite:///./treasury.db"

    # Normalize legacy postgres scheme if present
    if raw_url.startswith("postgres://"):
        raw_url = raw_url.replace("postgres://", "postgresql://", 1)

    return raw_url


SQLALCHEMY_DATABASE_URL = get_database_url()

# Create engine with SQLite-specific args only when needed
connect_args = {"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=connect_args)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database and create tables"""
    Base.metadata.create_all(bind=engine)
