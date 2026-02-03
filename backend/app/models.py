"""Database models - No PII stored."""
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Enum as SQLEnum
import enum

from app.database import Base


class ReportStatus(enum.Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"


class User(Base):
    """
    User entity tied to device fingerprint.
    No personally identifiable information is stored.
    """
    __tablename__ = "users"

    device_id = Column(String(64), primary_key=True, index=True)
    gender_result = Column(String(10), nullable=True)  # "Man" or "Woman"
    nickname = Column(String(50), nullable=True)
    bio = Column(String(200), nullable=True)
    karma_score = Column(Integer, default=100, nullable=False)
    daily_matches_count = Column(Integer, default=0)
    daily_specific_filter_count = Column(Integer, default=0)
    last_verified_at = Column(DateTime, nullable=True)
    last_active_date = Column(DateTime, default=datetime.utcnow)
    last_queue_time = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Report(Base):
    """Track user reports for karma system."""
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    reporter_device_id = Column(String(64), index=True, nullable=False)
    reported_device_id = Column(String(64), index=True, nullable=False)
    reason = Column(String(500), nullable=False)
    status = Column(SQLEnum(ReportStatus), default=ReportStatus.PENDING)
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
