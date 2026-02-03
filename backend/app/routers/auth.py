"""Authentication and user management routes."""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.database import get_db
from app.models import User
from app.services.karma import (
    get_or_create_user,
    get_karma,
    check_access_level,
    award_daily_login,
    reset_daily_limits,
)
from app.services.verification import verify_gender_from_image
from app.config import DAILY_SPECIFIC_FILTER_LIMIT

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    pass  # Device ID now comes from header


class ProfileUpdateRequest(BaseModel):
    nickname: str = Field(..., min_length=1, max_length=50)
    bio: str = Field("", max_length=200)


class UserResponse(BaseModel):
    device_id: str
    gender: str | None
    nickname: str | None
    bio: str | None
    karma_score: int
    access_level: str
    daily_matches_remaining: int
    is_verified: bool


@router.post("/register", response_model=UserResponse)
def register_device(
    request: RegisterRequest,
    x_device_id: str = Header(..., min_length=32, max_length=64, alias="X-Device-ID"),
    db: Session = Depends(get_db)
):
    """
    Register a new device or return existing session.
    No PII required - only device fingerprint.
    """
    user = get_or_create_user(db, x_device_id)
    reset_daily_limits(db, x_device_id)
    award_daily_login(db, x_device_id)
    
    access_level = check_access_level(db, x_device_id)
    
    return UserResponse(
        device_id=user.device_id,
        gender=user.gender_result,
        nickname=user.nickname,
        bio=user.bio,
        karma_score=user.karma_score,
        access_level=access_level,
        daily_matches_remaining=DAILY_SPECIFIC_FILTER_LIMIT - user.daily_specific_filter_count,
        is_verified=user.gender_result is not None,
    )


@router.post("/verify-gender")
async def verify_gender(
    x_device_id: str = Header(..., min_length=32, max_length=64, alias="X-Device-ID"),
    image: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Verify user's gender using camera capture.
    
    PRIVACY GUARANTEE:
    - Image is processed immediately
    - Image is deleted immediately after processing
    - Only gender result ("Man" or "Woman") is stored
    """
    # Check access level
    access = check_access_level(db, x_device_id)
    if access in ["permanent_ban", "temp_ban"]:
        raise HTTPException(
            status_code=403,
            detail=f"Access denied. Account status: {access}"
        )
    
    # Validate file type
    if image.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid image format. Use JPEG, PNG, or WebP."
        )
    
    # Read image bytes (in memory only)
    image_bytes = await image.read()
    
    # Verify gender (image deleted inside this function)
    gender, error = verify_gender_from_image(image_bytes)
    
    # Clear memory reference
    del image_bytes
    
    if error:
        raise HTTPException(status_code=400, detail=error)
    
    # Update user record
    user = get_or_create_user(db, x_device_id)
    user.gender_result = gender
    user.last_verified_at = datetime.utcnow()
    db.commit()
    
    return {
        "success": True,
        "gender": gender,
        "message": "Verification complete. Image has been deleted."
    }


@router.put("/profile", response_model=UserResponse)
def update_profile(
    request: ProfileUpdateRequest,
    x_device_id: str = Header(..., min_length=32, max_length=64, alias="X-Device-ID"),
    db: Session = Depends(get_db)
):
    """Update user's nickname and bio."""
    user = db.query(User).filter(
        User.device_id == x_device_id
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.nickname = request.nickname
    user.bio = request.bio
    db.commit()
    db.refresh(user)
    
    access_level = check_access_level(db, x_device_id)
    
    return UserResponse(
        device_id=user.device_id,
        gender=user.gender_result,
        nickname=user.nickname,
        bio=user.bio,
        karma_score=user.karma_score,
        access_level=access_level,
        daily_matches_remaining=DAILY_SPECIFIC_FILTER_LIMIT - user.daily_specific_filter_count,
        is_verified=user.gender_result is not None,
    )


@router.get("/me", response_model=UserResponse)
def get_current_user(
    x_device_id: str = Header(..., min_length=32, max_length=64, alias="X-Device-ID"),
    db: Session = Depends(get_db)
):
    """Get current user info."""
    user = db.query(User).filter(
        User.device_id == x_device_id
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    access_level = check_access_level(db, x_device_id)
    
    return UserResponse(
        device_id=user.device_id,
        gender=user.gender_result,
        nickname=user.nickname,
        bio=user.bio,
        karma_score=user.karma_score,
        access_level=access_level,
        daily_matches_remaining=DAILY_SPECIFIC_FILTER_LIMIT - user.daily_specific_filter_count,
        is_verified=user.gender_result is not None,
    )
