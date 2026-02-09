"""
SQLAlchemy database models for CommuPath.
Defines User, Quest, and QuestSubmission tables.
"""

from sqlalchemy import Column, String, Integer, Float, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from database import Base
import uuid


def generate_uuid():
    """Generate a

 UUID string"""
    return str(uuid.uuid4())


class User(Base):
    """User model for authentication and leaderboard"""
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100))
    
    # Gamification fields
    impact_level = Column(String(20), default="Novice")
    points = Column(Integer, default=0)
    completed_quests = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    def to_dict(self):
        """Convert to dictionary for API responses"""
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "full_name": self.full_name,
            "impact_level": self.impact_level,
            "points": self.points,
            "completed_quests": self.completed_quests,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class Quest(Base):
    """Quest model for community impact missions"""
    __tablename__ = "quests"
    
    quest_id = Column(String(50), primary_key=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(20), nullable=False)  # Environment, Social, Education, Health
    difficulty = Column(String(20), nullable=False)  # Easy, Medium, Hard
    
    # Quest details
    impact_metric = Column(String(255))
    estimated_time = Column(String(50))
    community_benefit = Column(Text)
    
    # Location
    location_lat = Column(Float, nullable=False)
    location_lng = Column(Float, nullable=False)
    
    # Status: Active, In Progress, Completed
    status = Column(String(20), default="Active")
    
    # User relationships
    created_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    assigned_to = Column(String(36), ForeignKey("users.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    def to_dict(self):
        """Convert to dictionary for API responses"""
        return {
            "quest_id": self.quest_id,
            "title": self.title,
            "description": self.description,
            "category": self.category,
            "difficulty": self.difficulty,
            "impact_metric": self.impact_metric,
            "estimated_time": self.estimated_time,
            "community_benefit": self.community_benefit,
            "location": {
                "lat": self.location_lat,
                "lng": self.location_lng
            },
            "status": self.status,
            "created_by": self.created_by,
            "assigned_to": self.assigned_to,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None
        }


class QuestSubmission(Base):
    """Submission model for quest proof verification"""
    __tablename__ = "quest_submissions"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    quest_id = Column(String(50), ForeignKey("quests.quest_id"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    
    # Submission data
    image_path = Column(String(500), nullable=False)  # Path to uploaded image
    description = Column(Text, nullable=True)  # Optional text description
    
    # AI Verification results
    confidence_score = Column(Float, default=0.0)  # 0.0 - 1.0
    verification_result = Column(String(20), default="Pending")  # Verified, Rejected, Pending
    ai_reasoning = Column(Text)  # AI's explanation
    
    # Points awarded
    points_awarded = Column(Integer, default=0)
    
    # Timestamp
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def to_dict(self):
        """Convert to dictionary for API responses"""
        return {
            "id": self.id,
            "quest_id": self.quest_id,
            "user_id": self.user_id,
            "image_path": self.image_path,
            "description": self.description,
            "confidence_score": self.confidence_score,
            "verification_result": self.verification_result,
            "ai_reasoning": self.ai_reasoning,
            "points_awarded": self.points_awarded,
            "submitted_at": self.submitted_at.isoformat() if self.submitted_at else None
        }
