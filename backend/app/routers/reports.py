"""Report and karma management routes."""
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import List

from app.database import get_db
from app.models import Report, ReportStatus
from app.services.karma import (
    get_karma,
    check_access_level,
    submit_report,
    award_chat_completion,
)

router = APIRouter(prefix="/api/reports", tags=["reports"])


class ReportRequest(BaseModel):
    reported_device_id: str = Field(..., min_length=32, max_length=64)
    reason: str = Field(..., min_length=10, max_length=500)


class ReportResponse(BaseModel):
    id: int
    status: str
    message: str


class KarmaResponse(BaseModel):
    device_id: str
    karma_score: int
    access_level: str


@router.post("/submit", response_model=ReportResponse)
def submit_user_report(
    request: ReportRequest,
    reporter_device_id: str = Header(..., min_length=32, max_length=64, alias="X-Device-ID"),
    db: Session = Depends(get_db)
):
    """
    Submit a report against another user.
    Initial karma penalty is applied to the reported user.
    """
    # Can't report yourself
    if reporter_device_id == request.reported_device_id:
        raise HTTPException(
            status_code=400,
            detail="Cannot report yourself"
        )
    
    # Check reporter's access level
    access = check_access_level(db, reporter_device_id)
    if access in ["permanent_ban", "temp_ban"]:
        raise HTTPException(
            status_code=403,
            detail="Your account is restricted from reporting"
        )
    
    report = submit_report(
        db,
        reporter_device_id,
        request.reported_device_id,
        request.reason
    )
    
    return ReportResponse(
        id=report.id,
        status=report.status.value,
        message="Report submitted. The user has been penalized."
    )


@router.get("/karma", response_model=KarmaResponse)
def get_user_karma(device_id: str, db: Session = Depends(get_db)):
    """Get karma score and access level for a device."""
    karma = get_karma(db, device_id)
    access = check_access_level(db, device_id)
    
    return KarmaResponse(
        device_id=device_id,
        karma_score=karma,
        access_level=access
    )


@router.post("/chat-complete")
def complete_chat(device_id: str, db: Session = Depends(get_db)):
    """
    Mark a chat as completed without reports.
    Awards karma bonus.
    """
    new_karma = award_chat_completion(db, device_id)
    
    return {
        "success": True,
        "new_karma": new_karma,
        "message": "Chat completed! Karma bonus awarded."
    }
