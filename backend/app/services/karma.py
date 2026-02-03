"""Karma service - Reputation management system."""
from datetime import datetime, date
from sqlalchemy.orm import Session
from typing import Literal

from app.models import User, Report, ReportStatus
from app.config import (
    KARMA_INITIAL,
    KARMA_CHAT_COMPLETE,
    KARMA_REPORTED,
    KARMA_REPORT_VERIFIED,
    KARMA_FALSE_REPORT,
    KARMA_DAILY_LOGIN,
    KARMA_FULL_ACCESS,
    KARMA_STANDARD_ACCESS,
    KARMA_WARNING,
    KARMA_TEMP_BAN,
)


AccessLevel = Literal["full", "standard", "warning", "temp_ban", "permanent_ban"]


def get_or_create_user(db: Session, device_id: str) -> User:
    """Get existing user or create new one with initial karma."""
    user = db.query(User).filter(User.device_id == device_id).first()
    if not user:
        user = User(
            device_id=device_id,
            karma_score=KARMA_INITIAL,
            daily_matches_count=0,
            daily_specific_filter_count=0,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def get_karma(db: Session, device_id: str) -> int:
    """Get current karma score for a device."""
    user = get_or_create_user(db, device_id)
    return user.karma_score


def update_karma(db: Session, device_id: str, delta: int, reason: str = "") -> int:
    """Adjust karma score by delta. Returns new karma value."""
    user = get_or_create_user(db, device_id)
    user.karma_score = max(0, user.karma_score + delta)  # Floor at 0
    db.commit()
    db.refresh(user)
    return user.karma_score


def check_access_level(db: Session, device_id: str) -> AccessLevel:
    """Determine access tier based on karma thresholds."""
    karma = get_karma(db, device_id)
    
    if karma <= 0:
        return "permanent_ban"
    elif karma < KARMA_TEMP_BAN:
        return "temp_ban"
    elif karma < KARMA_WARNING:
        return "warning"
    elif karma < KARMA_FULL_ACCESS:
        return "standard"
    else:
        return "full"


def submit_report(
    db: Session,
    reporter_device_id: str,
    reported_device_id: str,
    reason: str
) -> Report:
    """
    Submit a report against another user.
    Applies initial karma penalty to the reported user.
    """
    # Create the report
    report = Report(
        reporter_device_id=reporter_device_id,
        reported_device_id=reported_device_id,
        reason=reason,
        status=ReportStatus.PENDING,
    )
    db.add(report)
    
    # Apply initial penalty to reported user
    update_karma(db, reported_device_id, KARMA_REPORTED, f"Reported: {reason}")
    
    db.commit()
    db.refresh(report)
    return report


def verify_report(db: Session, report_id: int, is_valid: bool) -> Report:
    """
    Verify a report (admin action).
    If valid: additional penalty to reported user.
    If invalid: penalty to reporter for false report.
    """
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise ValueError("Report not found")
    
    if is_valid:
        report.status = ReportStatus.VERIFIED
        update_karma(
            db,
            report.reported_device_id,
            KARMA_REPORT_VERIFIED,
            "Report verified"
        )
    else:
        report.status = ReportStatus.REJECTED
        update_karma(
            db,
            report.reporter_device_id,
            KARMA_FALSE_REPORT,
            "False report submitted"
        )
    
    report.resolved_at = datetime.utcnow()
    db.commit()
    db.refresh(report)
    return report


def award_chat_completion(db: Session, device_id: str) -> int:
    """Award karma for completing a chat without reports."""
    return update_karma(db, device_id, KARMA_CHAT_COMPLETE, "Chat completed")


def award_daily_login(db: Session, device_id: str) -> int:
    """Award karma for daily login streak."""
    user = get_or_create_user(db, device_id)
    today = date.today()
    
    # Check if already logged in today
    if user.last_active_date and user.last_active_date.date() == today:
        return user.karma_score
    
    # Update last active and award karma
    user.last_active_date = datetime.utcnow()
    new_karma = update_karma(db, device_id, KARMA_DAILY_LOGIN, "Daily login")
    return new_karma


def reset_daily_limits(db: Session, device_id: str) -> None:
    """Reset daily match limits if new day."""
    user = get_or_create_user(db, device_id)
    today = date.today()
    
    if user.last_active_date and user.last_active_date.date() < today:
        user.daily_matches_count = 0
        user.daily_specific_filter_count = 0
        db.commit()
