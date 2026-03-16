# AI generated with Claude — SQLAlchemy engine, session factory, and get_db dependency for FastAPI
import os
from sqlalchemy import create_engine, URL
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

# Build the URL from individual parts so special characters in the password
# are handled safely (no URL-encoding needed in .env)
connection_url = URL.create(
    drivername="postgresql+psycopg2",
    username=os.environ["DB_USER"],
    password=os.environ["DB_PASSWORD"],   # passed as-is, not URL-parsed
    host=os.environ["DB_HOST"],
    port=int(os.environ.get("DB_PORT", 5432)),
    database=os.environ["DB_NAME"],
    query={"sslmode": "require"},
)

engine = create_engine(connection_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()

def get_db():
    """FastAPI dependency — yields a DB session and ensures it is closed after the request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
