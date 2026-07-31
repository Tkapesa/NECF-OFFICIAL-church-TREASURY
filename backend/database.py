"""
Database configuration and session management
"""
import os
import sys
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Render sets RENDER=true on all hosted services
IS_RENDER = os.getenv("RENDER", "").lower() in {"1", "true", "yes"}
FORCE_POSTGRES = os.getenv("REQUIRE_POSTGRES", "").lower() in {"1", "true", "yes"}


def get_database_url() -> str:
    """Return a usable database URL, falling back to SQLite when unset or blank."""
    raw_url = os.getenv("DATABASE_URL", "").strip()
    if not raw_url:
        if IS_RENDER or FORCE_POSTGRES:
            print(
                "FATAL: DATABASE_URL is required in production.\n"
                "Render's disk is ephemeral — SQLite/uploads are wiped on every restart.\n"
                "Set DATABASE_URL to a Neon/PostgreSQL connection string in the Render dashboard.",
                file=sys.stderr,
            )
            raise RuntimeError(
                "DATABASE_URL must be set to a PostgreSQL URL in production "
                "(e.g. Neon pooled connection with sslmode=require)."
            )
        return "sqlite:///./treasury.db"

    # Normalize legacy postgres scheme if present
    if raw_url.startswith("postgres://"):
        raw_url = raw_url.replace("postgres://", "postgresql://", 1)

    if (IS_RENDER or FORCE_POSTGRES) and not raw_url.startswith("postgresql"):
        raise RuntimeError(
            "Production DATABASE_URL must be a PostgreSQL connection string, "
            f"got scheme from: {raw_url.split(':', 1)[0]}"
        )

    return raw_url


SQLALCHEMY_DATABASE_URL = get_database_url()

# Create engine with dialect-specific options
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False},
    )
else:
    # Neon / managed Postgres: recycle + pre-ping avoid stale serverless connections
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=300,
    )

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
    """Initialize database and create/upgrade tables"""
    Base.metadata.create_all(bind=engine)
    _ensure_receipt_image_columns()


def _ensure_receipt_image_columns():
    """
    Add image_data / image_content_type if missing.
    create_all() does not alter existing tables.
    """
    inspector = inspect(engine)
    if "receipts" not in inspector.get_table_names():
        return

    existing = {col["name"] for col in inspector.get_columns("receipts")}
    statements = []
    if "image_data" not in existing:
        # BYTEA on Postgres, BLOB on SQLite
        col_type = "BYTEA" if engine.dialect.name == "postgresql" else "BLOB"
        statements.append(f"ALTER TABLE receipts ADD COLUMN image_data {col_type}")
    if "image_content_type" not in existing:
        statements.append("ALTER TABLE receipts ADD COLUMN image_content_type VARCHAR")

    if not statements:
        return

    with engine.begin() as conn:
        for stmt in statements:
            conn.execute(text(stmt))
            print(f"[OK] Migrated schema: {stmt}")
