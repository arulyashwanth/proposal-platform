import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from dotenv import load_dotenv

load_dotenv()

# Grab the Supabase Postgres URL or fallback to local SQLite for demo/offline reliability
raw_db_url = os.getenv("SUPABASE_DB_URL")

if raw_db_url and "your_project_ref" not in raw_db_url and raw_db_url.strip():
    SQLALCHEMY_DATABASE_URL = raw_db_url.strip()
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_pre_ping=True,   # test connection before using it (prevents SSL EOF errors)
        pool_recycle=300,     # recycle connections every 5 minutes
    )
else:
    # Local SQLite fallback for seamless demo execution
    SQLALCHEMY_DATABASE_URL = "sqlite:///./mekatron.db"
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False},
        pool_pre_ping=True,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
