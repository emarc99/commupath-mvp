import os
import json
from typing import Optional
from google import genai
from opik import track, opik_context
from models import ImpactQuest, Coordinates, ResolutionCategory, Difficulty

class CommunityArchitect:
    """
    AI Agent that generates location-aware community impact quests
    using Google Gemini 2.5 Pro with structured JSON output
    """
    
    def __init__(self):
        """Initialize the Gemini client"""
        # Get API key from environment variable
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable not set")
        
        # Initialize Gemini client (uses GEMINI_API_KEY env var automatically)
        self.client = genai.Client()
        self.model = "gemini-2.0-flash-exp"  # Using latest model
    
    @track(
        name="generate_community_quest",
        project_name="CommuPath",
        tags=["quest-generation", "gemini-2.5-pro"]
    )
    async def generate_quest(
        self,
        coordinates: Coordinates,
        resolution_category: ResolutionCategory,
        user_preferences: Optional[str] = None
    ) -> ImpactQuest:
        """
        Generate a location-specific community impact quest
        
        Args:
            coordinates: GPS coordinates for quest location
            resolution_category: Category of the resolution/quest
            user_preferences: Optional user preferences
            
        Returns:
            ImpactQuest: Generated quest with all details
        """
        
        # Set metadata for Opik tracking
        if opik_context.get_current_span_data():
            opik_context.update_current_span(
                metadata={
                    "category": resolution_category.value,
                    "latitude": coordinates.lat,
                    "longitude": coordinates.lng,
                    "has_preferences": user_preferences is not None
                }
            )
        
        # Build the prompt with location context
        prompt = self._build_prompt(coordinates, resolution_category, user_preferences)
        
        print(f"🤖 Calling Gemini API with model: {self.model}")
        print(f"   Location: {self._get_location_name(coordinates)}")
        print(f"   Category: {resolution_category.value}")
        
        try:
            # Generate content with structured JSON output
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=genai.types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema={
                        "type": "object",
                        "properties": {
                            "title": {"type": "string"},
                            "description": {"type": "string"},
                            "difficulty": {"type": "string", "enum": ["Easy", "Medium", "Hard"]},
                            "impact_metric": {"type": "string"},
                            "estimated_time": {"type": "string"},
                            "community_benefit": {"type": "string"}
                        },
                        "required": ["title", "description", "difficulty", "impact_metric"]
                    }
                )
            )
            
            # Parse the JSON response
            quest_data = json.loads(response.text)
            
            # Generate unique quest ID
            import uuid
            quest_id = f"quest_{uuid.uuid4().hex[:8]}"
            
            # Create ImpactQuest object
            quest = ImpactQuest(
                quest_id=quest_id,
                title=quest_data["title"],
                description=quest_data["description"],
                difficulty=Difficulty(quest_data["difficulty"]),
                impact_metric=quest_data["impact_metric"],
                location=coordinates,
                category=resolution_category,
                estimated_time=quest_data.get("estimated_time"),
                community_benefit=quest_data.get("community_benefit")
            )
            
            # Log to Opik with feedback scores
            if opik_context.get_current_span_data():
                opik_context.update_current_span(
                    output=quest.model_dump(),  # Use dict, not JSON string
                    metadata={
                        "quest_id": quest_id,
                        "location_name": self._get_location_name(coordinates),
                        "gemini_model": self.model
                    }
                )
            
            return quest
            
        except Exception as e:
            # Fallback: return a generic quest if API fails
            print(f"❌ Error generating quest with Gemini: {e}")
            print(f"   Error type: {type(e).__name__}")
            import traceback
            traceback.print_exc()
            return self._generate_fallback_quest(coordinates, resolution_category)
    
    def _build_prompt(
        self,
        coordinates: Coordinates,
        resolution_category: ResolutionCategory,
        user_preferences: Optional[str]
    ) -> str:
        """Build the prompt for Gemini"""
        
        # Determine location context (simulated - in production, use reverse geocoding)
        location_name = self._get_location_name(coordinates)
        
        prompt = f"""You are the Community Architect AI, an expert at transforming personal resolutions into actionable community impact quests.

Generate a specific, actionable community impact quest based on the following information:

**Location**: {location_name} (Lat: {coordinates.lat}, Lng: {coordinates.lng})
**Resolution Category**: {resolution_category.value}
**User Preferences**: {user_preferences or "None specified"}

**Requirements**:
1. The quest MUST be location-specific and relevant to {location_name}
2. It should address a real community need in the {resolution_category.value} category
3. It must be actionable (user can complete it within days/weeks)
4. Include a measurable impact metric (e.g., "Plant 50 trees", "Tutor 10 students")
5. Specify community benefit in concrete terms
6. Assign appropriate difficulty (Easy: 1-2 hours, Medium: 3-5 hours, Hard: 6+ hours or multiple sessions)

**Example Output**:
For Environment category in Ibadan, Nigeria:
{{
  "title": "Clean Up Agodi Gardens Water Feature",
  "description": "Organize a community cleanup of the pond area at Agodi Gardens. Remove plastic waste, trim overgrown vegetation around the water, and install educational signage about pollution prevention. Partner with local schools to involve youth.",
  "difficulty": "Medium",
  "impact_metric": "Remove 100kg of waste, restore 200 sq meters of waterfront",
  "estimated_time": "4 hours (Saturday morning)",
  "community_benefit": "Cleaner recreational space for 500+ weekly visitors, improved water quality for local wildlife"
}}

Generate a similar quest for the given location and category. Be specific, realistic, and inspiring."""

        return prompt
    
    def _get_location_name(self, coordinates: Coordinates) -> str:
        """
        Get location name from coordinates (simplified for MVP)
        In production, use Google Maps Geocoding API
        """
        # Rough location mapping for demo
        if 7.3 <= coordinates.lat <= 7.5 and 3.8 <= coordinates.lng <= 4.0:
            return "Ibadan, Nigeria"
        elif 6.4 <= coordinates.lat <= 6.6 and 3.3 <= coordinates.lng <= 3.5:
            return "Lagos, Nigeria"
        elif -1.3 <= coordinates.lat <= -1.2 and 36.8 <= coordinates.lng <= 36.9:
            return "Nairobi, Kenya"
        else:
            return f"Location near ({coordinates.lat:.2f}, {coordinates.lng:.2f})"
    
    def _generate_fallback_quest(
        self,
        coordinates: Coordinates,
        resolution_category: ResolutionCategory
    ) -> ImpactQuest:
        """Generate a fallback quest if API fails"""
        import uuid
        
        fallback_quests = {
            ResolutionCategory.ENVIRONMENT: {
                "title": "Community Park Cleanup",
                "description": "Organize a cleanup event at a local park. Remove litter, plant flowers, and create a cleaner environment for everyone.",
                "impact_metric": "Clean 200 sq meters of public space",
                "estimated_time": "2-3 hours"
            },
            ResolutionCategory.SOCIAL: {
                "title": "Community Meal Sharing",
                "description": "Organize a community meal event where neighbors can share food and connect. Promote social cohesion and reduce isolation.",
                "impact_metric": "Bring together 20+ community members",
                "estimated_time": "3-4 hours"
            },
            ResolutionCategory.EDUCATION: {
                "title": "Free Tutoring Sessions",
                "description": "Provide free tutoring to local students in math or reading. Help improve academic performance in your community.",
                "impact_metric": "Tutor 5-10 students for 2 weeks",
                "estimated_time": "2 hours per week"
            },
            ResolutionCategory.HEALTH: {
                "title": "Community Fitness Walk",
                "description": "Organize weekly walking groups to promote physical activity and wellness in your community.",
                "impact_metric": "15+ participants per walk",
                "estimated_time": "1 hour per session"
            }
        }
        
        template = fallback_quests[resolution_category]
        
        return ImpactQuest(
            quest_id=f"quest_{uuid.uuid4().hex[:8]}",
            title=template["title"],
            description=template["description"],
            difficulty=Difficulty.MEDIUM,
            impact_metric=template["impact_metric"],
            location=coordinates,
            category=resolution_category,
            estimated_time=template["estimated_time"],
            community_benefit="Strengthens community bonds and creates positive local impact"
        )
