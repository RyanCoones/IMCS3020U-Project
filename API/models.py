# AI generated with Claude — SQLAlchemy ORM models for users and check history
import uuid
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from database import Base


class User(Base):
    """One row per Cognito user. Created automatically on their first check."""
    __tablename__ = "users"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cognito_sub   = Column(String, unique=True, nullable=False, index=True)  # stable Cognito user ID
    username      = Column(String)
    email         = Column(String)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())


class Check(Base):
    """One row per credibility check performed by a logged-in user."""
    __tablename__ = "checks"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id     = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    url         = Column(Text, nullable=False)
    title       = Column(Text)           # article title extracted by newspaper (may be None)
    label       = Column(String, nullable=False)    # "real" | "fake"
    probability = Column(Float, nullable=False)     # raw model output (probability of being real)
    explanation = Column(Text, nullable=True)       # AI-generated explanation from AWS Bedrock
    checked_at  = Column(DateTime(timezone=True), server_default=func.now())
