from pydantic import BaseModel, Field, field_validator
from typing import Optional
from enum import Enum

class ResolutionCategory(str, Enum):
    """Categories for New Year's resolutions and community impact"""
    ENVIRONMENT = "Environment"
    SOCIAL = "Social"
    EDUCATION = "Education"
    HEALTH = "Health"

class Difficulty(str, Enum):
    """Quest difficulty levels"""
    EASY = "Easy"
    MEDIUM = "Medium"
    HARD = "Hard"

class Coordinates(BaseModel):
    """GPS coordinates"""
    lat: float = Field(..., ge=-90, le=90, description="Latitude")
    lng: float = Field(..., ge=-180, le=180, description="Longitude")

class QuestRequest(BaseModel):
    """Request model for quest generation"""
    coordinates: Coordinates
    resolution_category: ResolutionCategory
    user_preferences: Optional[str] = Field(None, description="Optional user preferences or constraints")
    make_public: bool = Field(False, description="If True, quest is public for community; if False, assigned to creator")

    class Config:
        json_schema_extra = {
            "example": {
                "coordinates": {"lat": 7.3775, "lng": 3.9470},
                "resolution_category": "Environment",
                "user_preferences": "I prefer outdoor activities and have weekends free",
                "make_public": False
            }
        }

class ImpactQuest(BaseModel):
    """Generated impact quest"""
    quest_id: str = Field(..., description="Unique quest identifier")
    title: str = Field(..., min_length=5, max_length=100, description="Quest title")
    description: str = Field(..., min_length=20, description="Detailed quest description")
    difficulty: Difficulty
    impact_metric: str = Field(..., description="Measurable impact metric")
    location: Coordinates
    category: ResolutionCategory
    estimated_time: Optional[str] = Field(None, description="Estimated time to complete")
    community_benefit: Optional[str] = Field(None, description="Description of community benefit")
    
    class Config:
        json_schema_extra = {
            "example": {
                "quest_id": "quest_12345",
                "title": "Clean Up Bodija Park",
                "description": "Organize a community cleanup of Bodija Park. Collect litter, trim overgrown bushes, and restore the playground area.",
                "difficulty": "Medium",
                "impact_metric": "Clean 500 sq meters of public space",
                "location": {"lat": 7.4336, "lng": 3.9057},
                "category": "Environment",
                "estimated_time": "3 hours",
                "community_benefit": "Improved recreational space for 200+ families"
            }
        }
