from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import create_engine, Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from datetime import datetime
import os

# Database connection string
DATABASE_URL = os.getenv(
    "DATABASE_URL",
   # "<-Your database URL->"
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# User table
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)

# Layout table
class Layout(Base):
    __tablename__ = "layouts"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)
    data = Column(Text)
    user = relationship("User")

# UPDATED: Added conversation_id to ChatLog
class ChatLog(Base):
    __tablename__ = "chatlogs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=True)  # NEW FIELD
    message = Column(Text)
    response = Column(Text)
    timestamp = Column(DateTime)
    user = relationship("User")

# Feedback table
class Feedback(Base):
    __tablename__ = "feedback"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    feedback = Column(Text)
    timestamp = Column(DateTime)
    user = relationship("User")

# Conversation table
class Conversation(Base):
    __tablename__ = "conversations"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("User")

# LayoutSnapshot table
class LayoutSnapshot(Base):
    __tablename__ = "layout_snapshots"
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"))
    layout_data = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    conversation = relationship("Conversation")

# Create tables
def init_db():
    Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    init_db()
    print("Database tables created successfully!")
