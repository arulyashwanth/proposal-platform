import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from dotenv import load_dotenv

load_dotenv()

# Grab the Supabase Postgres URL
SQLALCHEMY_DATABASE_URL = os.getenv("SUPABASE_DB_URL")

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,   # test connection before using it (prevents SSL EOF errors)
    pool_recycle=300,     # recycle connections every 5 minutes
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
