"""
WebSocket endpoint for real-time matching and chat.
Handles: Queue -> Match -> Chat Session -> Leave/Next
"""
import json
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session

from app.database import get_db, SessionLocal
from app.models import User
from app.services.matching import matching_service
from app.services.karma import check_access_level, award_chat_completion
from app.config import QUEUE_COOLDOWN_SECONDS, DAILY_SPECIFIC_FILTER_LIMIT

router = APIRouter()


class ConnectionManager:
    """Manages WebSocket connections and message routing."""
    
    def __init__(self):
        # device_id -> WebSocket
        self.active_connections: Dict[str, WebSocket] = {}
        # device_id -> partner_device_id
        self.active_chats: Dict[str, str] = {}
        # device_id -> last queue time
        self.queue_cooldowns: Dict[str, datetime] = {}
    
    async def connect(self, device_id: str, websocket: WebSocket):
        """Accept and register a new connection."""
        await websocket.accept()
        self.active_connections[device_id] = websocket
    
    def disconnect(self, device_id: str):
        """Remove a connection."""
        self.active_connections.pop(device_id, None)
        partner_id = self.active_chats.pop(device_id, None)
        if partner_id:
            self.active_chats.pop(partner_id, None)
    
    async def send_personal(self, device_id: str, message: dict):
        """Send message to a specific user."""
        ws = self.active_connections.get(device_id)
        if ws:
            try:
                await ws.send_json(message)
            except Exception:
                self.disconnect(device_id)
    
    async def send_to_partner(self, device_id: str, message: dict):
        """Send message to the chat partner."""
        partner_id = self.active_chats.get(device_id)
        if partner_id:
            await self.send_personal(partner_id, message)
    
    def set_chat_pair(self, device_id1: str, device_id2: str):
        """Establish a chat connection between two users."""
        self.active_chats[device_id1] = device_id2
        self.active_chats[device_id2] = device_id1
    
    def get_partner(self, device_id: str) -> str | None:
        """Get the partner's device ID."""
        return self.active_chats.get(device_id)
    
    def can_queue(self, device_id: str) -> bool:
        """Check if user is past cooldown period."""
        last_queue = self.queue_cooldowns.get(device_id)
        if not last_queue:
            return True
        return datetime.utcnow() > last_queue + timedelta(seconds=QUEUE_COOLDOWN_SECONDS)
    
    def set_queue_cooldown(self, device_id: str):
        """Set cooldown timestamp."""
        self.queue_cooldowns[device_id] = datetime.utcnow()


manager = ConnectionManager()


@router.websocket("/ws/chat/{device_id}")
async def websocket_endpoint(websocket: WebSocket, device_id: str):
    """
    WebSocket endpoint for matching and chat.
    
    Message types (client -> server):
    - {"type": "join_queue", "looking_for": "male"|"female"|"any"}
    - {"type": "leave_queue"}
    - {"type": "send_message", "content": "..."}
    - {"type": "leave_chat"}
    - {"type": "next_match", "looking_for": "..."}
    
    Message types (server -> client):
    - {"type": "queued", "position": N}
    - {"type": "match_found", "partner": {"nickname": "...", "bio": "..."}}
    - {"type": "message", "from": "partner", "content": "..."}
    - {"type": "partner_left"}
    - {"type": "error", "message": "..."}
    """
    # Get database session
    db = SessionLocal()
    
    try:
        # Verify user exists and has access
        user = db.query(User).filter(
            User.device_id == device_id
        ).first()
        
        if not user:
            await websocket.close(code=4001, reason="User not found")
            return
        
        access = check_access_level(db, device_id)
        if access in ["permanent_ban", "temp_ban"]:
            await websocket.close(code=4003, reason=f"Access denied: {access}")
            return
        
        if not user.gender_result:
            await websocket.close(code=4002, reason="Gender verification required")
            return
        
        # Accept connection
        await manager.connect(device_id, websocket)
        
        await manager.send_personal(device_id, {
            "type": "connected",
            "karma": user.karma_score,
            "nickname": user.nickname,
        })
        
        # Main message loop
        while True:
            try:
                data = await websocket.receive_json()
                msg_type = data.get("type")
                
                if msg_type == "join_queue":
                    try:
                        await handle_join_queue(device_id, data, user, db)
                    except Exception as e:
                        import logging
                        logger = logging.getLogger(__name__)
                        logger.error(f"❌ Error in join_queue: {str(e)}", exc_info=True)
                        await manager.send_personal(device_id, {
                            "type": "error",
                            "message": f"Failed to join queue: {str(e)}"
                        })
                
                elif msg_type == "leave_queue":
                    await matching_service.remove_from_queue(
                        device_id, user.gender_result
                    )
                    await manager.send_personal(device_id, {
                        "type": "left_queue"
                    })
                
                elif msg_type == "send_message":
                    content = data.get("content", "").strip()
                    if content and len(content) <= 1000:
                        await manager.send_to_partner(device_id, {
                            "type": "message",
                            "from": "partner",
                            "content": content,
                            "timestamp": datetime.utcnow().isoformat(),
                        })
                
                elif msg_type == "leave_chat":
                    await handle_leave_chat(device_id, db)
                
                elif msg_type == "next_match":
                    # Leave current chat and find new match
                    await handle_leave_chat(device_id, db, notify_partner=True)
                    await handle_join_queue(device_id, data, user, db)
                
            except WebSocketDisconnect:
                break
            except json.JSONDecodeError:
                await manager.send_personal(device_id, {
                    "type": "error",
                    "message": "Invalid message format"
                })
    
    finally:
        # Cleanup on disconnect
        partner_id = manager.get_partner(device_id)
        if partner_id:
            await manager.send_personal(partner_id, {
                "type": "partner_left"
            })
        
        await matching_service.remove_from_queue(device_id, user.gender_result if user else "")
        await matching_service.end_match(device_id)
        manager.disconnect(device_id)
        db.close()


async def handle_join_queue(
    device_id: str,
    data: dict,
    user: User,
    db: Session
):
    """Handle queue join request."""
    looking_for = data.get("looking_for", "any").lower()
    
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"🔍 [JOIN_QUEUE] Device: {device_id[:12]}... | Gender: {user.gender_result} | Looking for: {looking_for}")
    
    # Check cooldown
    if not manager.can_queue(device_id):
        logger.info(f"⏱️ [JOIN_QUEUE] Cooldown active for {device_id[:12]}...")
        await manager.send_personal(device_id, {
            "type": "error",
            "message": f"Please wait {QUEUE_COOLDOWN_SECONDS} seconds between queue attempts"
        })
        return
    
    # Check daily limit for specific filters
    if looking_for != "any":
        if user.daily_specific_filter_count >= DAILY_SPECIFIC_FILTER_LIMIT:
            logger.info(f"🚫 [JOIN_QUEUE] Daily limit reached for {device_id[:12]}...")
            await manager.send_personal(device_id, {
                "type": "error",
                "message": "Daily limit for specific filters reached. Try 'Any' or wait until tomorrow."
            })
            return
        
        # Increment counter
        user.daily_specific_filter_count += 1
        db.commit()
    
    # Add to queue
    logger.info(f"➕ [JOIN_QUEUE] Adding to queue...")
    await matching_service.add_to_queue(
        device_id,
        user.gender_result,
        looking_for
    )
    
    manager.set_queue_cooldown(device_id)
    
    logger.info(f"✅ [JOIN_QUEUE] Queued successfully")
    await manager.send_personal(device_id, {
        "type": "queued",
        "looking_for": looking_for,
    })
    
    # Try to find immediate match
    logger.info(f"🔍 [JOIN_QUEUE] Searching for match...")
    match = await matching_service.find_match(
        device_id,
        user.gender_result,
        looking_for
    )
    
    if match:
        logger.info(f"🎉 [JOIN_QUEUE] MATCH FOUND! Partner: {match['device_id'][:12]}...")
        await establish_match(device_id, match["device_id"], db)
    else:
        logger.info(f"⏳ [JOIN_QUEUE] No match yet, waiting in queue...")



async def establish_match(device_id1: str, device_id2: str, db: Session):
    """Establish a chat match between two users."""
    # Get user info
    user1 = db.query(User).filter(
        User.device_id == device_id1
    ).first()
    user2 = db.query(User).filter(
        User.device_id == device_id2
    ).first()
    
    if not user1 or not user2:
        return
    
    # Set up chat pair
    manager.set_chat_pair(device_id1, device_id2)
    
    # Increment match counts
    user1.daily_matches_count += 1
    user2.daily_matches_count += 1
    db.commit()
    
    # Notify both users
    await manager.send_personal(device_id1, {
        "type": "match_found",
        "partner": {
            "nickname": user2.nickname or "Anonymous",
            "bio": user2.bio or "",
        }
    })
    
    await manager.send_personal(device_id2, {
        "type": "match_found",
        "partner": {
            "nickname": user1.nickname or "Anonymous",
            "bio": user1.bio or "",
        }
    })


async def handle_leave_chat(
    device_id: str,
    db: Session,
    notify_partner: bool = True
):
    """Handle leaving the current chat."""
    partner_id = manager.get_partner(device_id)
    
    if partner_id:
        # Award karma for clean chat completion
        award_chat_completion(db, device_id)
        
        if notify_partner:
            await manager.send_personal(partner_id, {
                "type": "partner_left"
            })
        
        # Clear chat pair
        manager.active_chats.pop(device_id, None)
        manager.active_chats.pop(partner_id, None)
    
    await matching_service.end_match(device_id)
    
    await manager.send_personal(device_id, {
        "type": "chat_ended"
    })
