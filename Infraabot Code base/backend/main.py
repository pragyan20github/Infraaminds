from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from model_handler import ArchitextModel
from layout_logic import parse_layout
from db import SessionLocal, Conversation, LayoutSnapshot, User, ChatLog
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

architext = ArchitextModel()

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic models
class ChatRequest(BaseModel):
    prompt: str
    user_id: int
    conversation_id: int  # NEW FIELD

class ConversationCreate(BaseModel):
    user_id: int
    title: str

class ConversationUpdate(BaseModel):
    title: str

class ConversationOut(BaseModel):
    id: int
    user_id: int
    title: str
    created_at: datetime

    class Config:
        orm_mode = True

class LayoutSnapshotCreate(BaseModel):
    conversation_id: int
    layout_data: str

class LayoutSnapshotOut(BaseModel):
    id: int
    conversation_id: int
    layout_data: str
    created_at: datetime

    class Config:
        orm_mode = True

class ChatLogOut(BaseModel):
    id: int
    user_id: int
    conversation_id: int
    message: str
    response: str
    timestamp: datetime

    class Config:
        orm_mode = True

# UPDATED: Now saves messages to database
@app.post("/chat")
def chat(request: ChatRequest, db: Session = Depends(get_db)):
    # Generate response from model
    architext_response = architext.generate(request.prompt)
    layout_json = parse_layout(architext_response)
    
    # Save to chat log
    chat_log = ChatLog(
        user_id=request.user_id,
        conversation_id=request.conversation_id,
        message=request.prompt,
        response=architext_response,
        timestamp=datetime.utcnow()
    )
    db.add(chat_log)
    db.commit()
    
    return {
        "response": architext_response,
        "layout": layout_json
    }

# Conversations endpoints
@app.get("/conversations", response_model=List[ConversationOut])
def list_conversations(user_id: int, db: Session = Depends(get_db)):
    return db.query(Conversation).filter(Conversation.user_id == user_id).order_by(Conversation.created_at.desc()).all()

@app.post("/conversations", response_model=ConversationOut)
def create_conversation(conv: ConversationCreate, db: Session = Depends(get_db)):
    db_conv = Conversation(user_id=conv.user_id, title=conv.title)
    db.add(db_conv)
    db.commit()
    db.refresh(db_conv)
    return db_conv

@app.patch("/conversations/{conversation_id}", response_model=ConversationOut)
def update_conversation(
    conversation_id: int,
    update: ConversationUpdate,
    db: Session = Depends(get_db)
):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    conv.title = update.title
    db.commit()
    db.refresh(conv)
    return conv

@app.delete("/conversations/{conversation_id}")
def delete_conversation(
    conversation_id: int,
    db: Session = Depends(get_db)
):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    # Delete related snapshots
    db.query(LayoutSnapshot).filter(LayoutSnapshot.conversation_id == conversation_id).delete()
    # Delete related chat logs
    db.query(ChatLog).filter(ChatLog.conversation_id == conversation_id).delete()
    db.delete(conv)
    db.commit()
    return {"detail": "Conversation and related data deleted"}

# Layout snapshots endpoints
@app.get("/conversations/{conversation_id}/snapshots", response_model=List[LayoutSnapshotOut])
def list_snapshots(conversation_id: int, db: Session = Depends(get_db)):
    return db.query(LayoutSnapshot).filter(LayoutSnapshot.conversation_id == conversation_id).order_by(LayoutSnapshot.created_at.asc()).all()

@app.post("/snapshots", response_model=LayoutSnapshotOut)
def create_snapshot(snapshot: LayoutSnapshotCreate, db: Session = Depends(get_db)):
    db_snap = LayoutSnapshot(conversation_id=snapshot.conversation_id, layout_data=snapshot.layout_data)
    db.add(db_snap)
    db.commit()
    db.refresh(db_snap)
    return db_snap

@app.delete("/snapshots/{snapshot_id}")
def delete_snapshot(
    snapshot_id: int,
    db: Session = Depends(get_db)
):
    snap = db.query(LayoutSnapshot).filter(LayoutSnapshot.id == snapshot_id).first()
    if not snap:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    db.delete(snap)
    db.commit()
    return {"detail": "Snapshot deleted"}

# NEW: Fetch conversation messages
@app.get("/conversations/{conversation_id}/messages", response_model=List[ChatLogOut])
def get_conversation_messages(conversation_id: int, db: Session = Depends(get_db)):
    return db.query(ChatLog).filter(ChatLog.conversation_id == conversation_id).order_by(ChatLog.timestamp.asc()).all()

# User info endpoint
@app.get("/user-info")
def get_user_info(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": user.id,
        "name": user.username,
        "email": f"{user.username}@example.com",
        "avatarUrl": "https://ui-avatars.com/api/?name=" + user.username
    }
