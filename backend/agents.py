import os
import json
from typing import Optional, List, Dict
from google import genai
from opik import track, opik_context
from models import ImpactQuest, Coordinates, ResolutionCategory, Difficulty
from location_service import LocationService

class CommunityArchitect:
    """
    AI Agent that generates location-aware community impact quests
    using Google Gemini 2.5 Pro with structured JSON output
    
    Now powered by Google Maps APIs for real-world location accuracy
    """
    
    def __init__(self):
        """Initialize the Gemini client and LocationService"""
        # Get API key from environment variable
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable not set")
        
        # Initialize Gemini client (uses GEMINI_API_KEY env var automatically)
        self.client = genai.Client()
        self.model = "gemini-2.5-pro"  # Using latest model
        
        # Initialize LocationService for Google Maps integration
        self.location_service = LocationService()
        print("✅ CommunityArchitect initialized with LocationService")
    
    @track(
        name="generate_location_aware_quest",
        project_name="CommuPath",
        tags=["quest-generation", "gemini-2.5-pro", "google-maps"]
    )
    async def generate_quest(
        self,
        coordinates: Coordinates,
        resolution_category: ResolutionCategory,
        user_preferences: Optional[str] = None
    ) -> Dict:
        """
        Generate a location-specific community impact quest using Google Maps + AI
        
        Process:
        1. Find real nearby places using Google Maps Places API
        2. AI selects best location and generates tailored quest
        3. Return quest with exact coordinates of chosen location
        
        Args:
            coordinates: GPS coordinates (user's click on map)
            resolution_category: Category of quest
            user_preferences: Optional user input
            
        Returns:
            Dict with quest data AND location metadata (name, address)
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
        
        print(f"\n🔍 STEP 1: Finding nearby {resolution_category.value} locations...")
        print(f"   Search center: ({coordinates.lat:.4f}, {coordinates.lng:.4f})")
        
        # STEP 1: Find real nearby places using Google Maps
        try:
            nearby_places = await self.location_service.find_nearby_places(
                center_coords=coordinates,
                category=resolution_category.value,
                radius=3000,  # 3km search radius
                max_results=5
            )
            
            if nearby_places:
                print(f"   ✅ Found {len(nearby_places)} nearby locations")
                for i, place in enumerate(nearby_places[:3]):
                    print(f"      {i+1}. {place['name']} (rating: {place.get('rating', 'N/A')})")
            else:
                print(f"   ⚠️  No nearby places found, using fallback generation")
                
        except Exception as e:
            print(f"   ❌ Error finding nearby places: {e}")
            nearby_places = []
        
        # STEP 2: If no places found, use traditional generation
        if not nearby_places:
            return await self._generate_quest_traditional(
                coordinates,
                resolution_category,
                user_preferences
            )
        
        # STEP 3: Rank places by quality score
        ranked_places = sorted(
            nearby_places,
            key=lambda p: self.location_service.calculate_place_quality_score(p),
            reverse=True
        )
        
        print(f"\n🤖 STEP 2: Generating quest with AI...")
        print(f"   Providing AI with {len(ranked_places[:3])} location options")
        
        # STEP 4: Build location-aware prompt
        prompt = self._build_location_aware_prompt(
            places=ranked_places[:3],  # Top 3 locations
            category=resolution_category,
            user_preferences=user_preferences
        )
        
        try:
            # STEP 5: AI selects location and generates quest
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=genai.types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema={
                        "type": "object",
                        "properties": {
                            "selected_location_index": {"type": "integer", "description": "Index of chosen location (0-2)"},
                            "title": {"type": "string"},
                            "description": {"type": "string"},
                            "difficulty": {"type": "string", "enum": ["Easy", "Medium", "Hard"]},
                            "impact_metric": {"type": "string"},
                            "estimated_time": {"type": "string"},
                            "community_benefit": {"type": "string"}
                        },
                        "required": ["selected_location_index", "title", "description", "difficulty", "impact_metric"]
                    }
                )
            )
            
            quest_data = json.loads(response.text)
            
            # STEP 6: Get AI-selected location
            selected_index = quest_data.get("selected_location_index", 0)
            selected_index = max(0, min(selected_index, len(ranked_places) - 1))  # Bounds check
            selected_place = ranked_places[selected_index]
            
            print(f"   ✅ AI selected: {selected_place['name']}")
            print(f"   📍 Coordinates: ({selected_place['coordinates'].lat:.4f}, {selected_place['coordinates'].lng:.4f})")
            
            # STEP 7: Create quest with exact location
            import uuid
            quest_id = f"quest_{uuid.uuid4().hex[:8]}"
            
            quest = ImpactQuest(
                quest_id=quest_id,
                title=quest_data["title"],
                description=quest_data["description"],
                difficulty=Difficulty(quest_data["difficulty"]),
                impact_metric=quest_data["impact_metric"],
                location=selected_place["coordinates"],  # EXACT COORDINATES FROM GOOGLE MAPS
                category=resolution_category,
                estimated_time=quest_data.get("estimated_time"),
                community_benefit=quest_data.get("community_benefit")
            )
            
            # Log to Opik
            if opik_context.get_current_span_data():
                opik_context.update_current_span(
                    output=quest.model_dump(),
                    metadata={
                        "quest_id": quest_id,
                        "location_name": selected_place["name"],
                        "location_address": selected_place.get("address"),
                        "gemini_model": self.model,
                        "google_maps_used": True
                    }
                )
            
            # Return quest WITH location metadata
            return {
                "quest": quest,
                "location_name": selected_place["name"],
                "location_address": selected_place.get("address", ""),
                "place_id": selected_place.get("place_id")
            }
            
        except Exception as e:
            print(f"   ❌ Error in AI generation: {e}")
            import traceback
            traceback.print_exc()
            
            # Fallback to traditional generation
            return await self._generate_quest_traditional(
                coordinates,
                resolution_category,
                user_preferences
            )
    
    def _build_location_aware_prompt(
        self,
        places: List[Dict],
        category: ResolutionCategory,
        user_preferences: Optional[str]
    ) -> str:
        """Build prompt with specific nearby locations for AI to choose from"""
        
        # Format places list for AI
        places_description = "\n".join([
            f"{i}. **{place['name']}**"
            f"\n   - Address: {place.get('address', 'Address unavailable')}"
            f"\n   - Rating: {place.get('rating', 'N/A')}/5.0 ({place.get('user_ratings_total', 0)} reviews)"
            f"\n   - Types: {', '.join(place.get('types', [])[:3])}"
            for i, place in enumerate(places)
        ])
        
        prompt = f"""You are the Community Architect AI, an expert at creating location-specific community impact quests.

**Available Real Locations** (from Google Maps):
{places_description}

**Task**: Generate a community impact quest
**Category**: {category.value}
**User Preferences**: {user_preferences or "None specified"}

**Instructions**:
1. SELECT ONE location from the list above (index 0, 1, or 2)
2. Create a quest SPECIFICALLY designed for that exact location
3. Mention the location NAME in the title
4. Make the quest actionable, measurable, and community-focused
5. Ensure it addresses a real need in that specific place

**Example Output**:
{{
  "selected_location_index": 0,
  "title": "Bodija Market Community Health Screening Day",
  "description": "Partner with Bodija Market traders association to organize free blood pressure and diabetes screening. Set up booths near the main entrance to reach maximum shoppers. Provide health education pamphlets in local languages.",
  "difficulty": "Medium",
  "impact_metric": "Screen 100+ market visitors for hypertension and diabetes",
  "estimated_time": "Half day (4-5 hours)",
  "community_benefit": "Early disease detection for 100+ community members, increased health awareness among traders"
}}

Generate a similar quest selecting the BEST location from the options above."""

        return prompt
    
    async def _generate_quest_traditional(
        self,
        coordinates: Coordinates,
        resolution_category: ResolutionCategory,
        user_preferences: Optional[str]
    ) -> Dict:
        """
        Traditional quest generation without Google Maps (fallback)
        Used when Places API is unavailable or returns no results
        """
        
        print(f"\n⚙️  Using traditional quest generation (no nearby places)")
        
        # Use original prompt builder
        prompt = self._build_prompt(coordinates, resolution_category, user_preferences)
        
        try:
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
            
            quest_data = json.loads(response.text)
            
            import uuid
            quest_id = f"quest_{uuid.uuid4().hex[:8]}"
            
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
            
            # Try to get location name from geocoding
            location_name = self.location_service.reverse_geocode(
                coordinates.lat,
                coordinates.lng
            )
            
            return {
                "quest": quest,
                "location_name": location_name or "Ibadan, Nigeria",
                "location_address": "",
                "place_id": None
            }
            
        except Exception as e:
            print(f"❌ Traditional generation also failed: {e}")
            # Final fallback - use hardcoded quest
            fallback_quest = self._generate_fallback_quest(coordinates, resolution_category)
            return {
                "quest": fallback_quest,
                "location_name": "Ibadan, Nigeria",
                "location_address": "",
                "place_id": None
            }
    
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
