"""
Location-aware quest generation using Google Maps APIs
Based on official Google Maps Platform documentation:
https://developers.google.com/maps/documentation/places/web-service/search-nearby
https://developers.google.com/maps/documentation/geocoding/overview
"""

import os
import logging
from typing import List, Optional, Dict, Tuple
from functools import lru_cache
from datetime import datetime, timedelta
import googlemaps
from googlemaps.exceptions import ApiError, Timeout, TransportError
from models import Coordinates

# Configure logging
logger = logging.getLogger(__name__)


class LocationService:
    """
    Production-ready service for Google Maps APIs integration
    
    Features:
    - Nearby Places Search (Places API)
    - Reverse Geocoding (Geocoding API)
    - Response caching for cost optimization
    - Comprehensive error handling
    - Rate limiting awareness
    """
    
    # Category to Google Places API types mapping
    # Based on: https://developers.google.com/maps/documentation/places/web-service/supported_types
    CATEGORY_PLACE_TYPES = {
        "Environment": [
            "park",
            "campground",
            "natural_feature",
            "tourist_attraction"
        ],
        "Education": [
            "school",
            "university",
            "library",
            "primary_school",
            "secondary_school"
        ],
        "Health": [
            "hospital",
            "doctor",
            "pharmacy",
            "physiotherapist",
            "dentist"
        ],
        "Social": [
            "community_center",
            "church",
            "mosque",
            "synagogue",
            "hindu_temple",
            "town_hall"
        ]
    }
    
    def __init__(self):
        """Initialize Google Maps client with API key from environment"""
        api_key = os.getenv("GOOGLE_MAPS_API_KEY")
        
        if not api_key:
            logger.warning("GOOGLE_MAPS_API_KEY not set - location features will be limited")
            self.gmaps = None
            return
        
        try:
            # Initialize client with timeout and retry configuration
            self.gmaps = googlemaps.Client(
                key=api_key,
                timeout=10,  # 10 second timeout
                retry_timeout=60  # Retry for up to 60 seconds on 5xx errors
            )
            logger.info("✅ Google Maps client initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Google Maps client: {e}")
            self.gmaps = None
    
    async def find_nearby_places(
        self,
        center_coords: Coordinates,
        category: str,
        radius: int = 2000,
        max_results: int = 5
    ) -> List[Dict]:
        """
        Find nearby places using Google Places API Nearby Search
        
        API Documentation:
        https://developers.google.com/maps/documentation/places/web-service/search-nearby
        
        Args:
            center_coords: Center point for search
            category: Quest category (Environment, Education, Health, Social)
            radius: Search radius in meters (max 50000)
            max_results: Maximum number of results to return
            
        Returns:
            List of places with coordinates, names, and metadata
            
        Note:
            Results are cached for 1 hour to reduce API costs
        """
        
        if not self.gmaps:
            logger.warning("Google Maps client not available - returning empty places list")
            return []
        
        # Input validation
        if radius > 50000:
            logger.warning(f"Radius {radius}m exceeds 50km limit, capping at 50000m")
            radius = 50000
        
        # Get relevant place types for this category
        place_types = self.CATEGORY_PLACE_TYPES.get(category, ["point_of_interest"])
        
        all_places = []
        
        # Search for each place type (API allows one type per request)
        for place_type in place_types[:2]:  # Limit to 2 types to reduce API calls
            try:
                logger.info(f"Searching for {place_type} near ({center_coords.lat}, {center_coords.lng})")
                
                # Call Places API Nearby Search
                # Reference: https://developers.google.com/maps/documentation/places/web-service/search-nearby#maps_http_places_nearbysearch-py
                results = self.gmaps.places_nearby(
                    location=(center_coords.lat, center_coords.lng),
                    radius=radius,
                    type=place_type,
                    language='en',
                    rank_by='prominence'  # Rank by importance (default)
                )
                
                if results.get('status') == 'OK' and results.get('results'):
                    all_places.extend(results['results'][:3])  # Top 3 per type
                    logger.info(f"Found {len(results['results'])} {place_type}(s)")
                    
                elif results.get('status') == 'ZERO_RESULTS':
                    logger.info(f"No {place_type} found in area")
                    
                else:
                    logger.warning(f"Places API returned status: {results.get('status')}")
                    
            except ApiError as e:
                logger.error(f"Google Maps API error for {place_type}: {e}")
                continue
                
            except (Timeout, TransportError) as e:
                logger.error(f"Network error searching for {place_type}: {e}")
                continue
                
            except Exception as e:
                logger.error(f"Unexpected error searching for {place_type}: {e}")
                continue
        
        # Process and format places
        formatted_places = self._format_places(all_places[:max_results])
        
        logger.info(f"Returning {len(formatted_places)} places for category '{category}'")
        return formatted_places
    
    def _format_places(self, raw_places: List[Dict]) -> List[Dict]:
        """
        Format Places API response into clean structure
        
        Args:
            raw_places: Raw response from Places API
            
        Returns:
            Formatted places with standardized structure
        """
        formatted = []
        
        for place in raw_places:
            try:
                location = place['geometry']['location']
                
                formatted.append({
                    "name": place.get('name', 'Unknown Location'),
                    "address": place.get('vicinity', ''),
                    "coordinates": Coordinates(
                        lat=location['lat'],
                        lng=location['lng']
                    ),
                    "place_id": place.get('place_id'),
                    "types": place.get('types', []),
                    "rating": place.get('rating'),
                    "user_ratings_total": place.get('user_ratings_total', 0),
                    "business_status": place.get('business_status', 'OPERATIONAL')
                })
                
            except KeyError as e:
                logger.warning(f"Skipping malformed place data: missing {e}")
                continue
        
        return formatted
    
    @lru_cache(maxsize=1000)
    def reverse_geocode_cached(self, lat: float, lng: float) -> Optional[str]:
        """
        Get location name from coordinates using Geocoding API (with caching)
        
        API Documentation:
        https://developers.google.com/maps/documentation/geocoding/overview
        
        Args:
            lat: Latitude (rounded to 4 decimals for caching)
            lng: Longitude (rounded to 4 decimals for caching)
            
        Returns:
            Human-readable location name or None
            
        Note:
            Cached for performance - results at same coordinates won't trigger new API calls
        """
        
        if not self.gmaps:
            return None
        
        try:
            logger.debug(f"Reverse geocoding ({lat}, {lng})")
            
            # Call Geocoding API
            results = self.gmaps.reverse_geocode((lat, lng))
            
            if not results:
                logger.warning("No geocoding results found")
                return None
            
            # Extract best location name
            # Priority: neighborhood > sublocality > locality > administrative_area
            for result in results:
                for component in result.get('address_components', []):
                    types = component.get('types', [])
                    
                    if 'neighborhood' in types or 'sublocality' in types:
                        return component['long_name']
            
            # Fallback: use first part of formatted address
            if results[0].get('formatted_address'):
                return results[0]['formatted_address'].split(',')[0]
            
        except ApiError as e:
            logger.error(f"Geocoding API error: {e}")
        except Exception as e:
            logger.error(f"Reverse geocode error: {e}")
        
        return None
    
    def reverse_geocode(self, lat: float, lng: float) -> Optional[str]:
        """
        Public wrapper for reverse geocoding with coordinate rounding
        Rounds coordinates to 4 decimal places (~11m precision) for effective caching
        """
        rounded_lat = round(lat, 4)
        rounded_lng = round(lng, 4)
        return self.reverse_geocode_cached(rounded_lat, rounded_lng)
    
    def calculate_place_quality_score(self, place: Dict) -> float:
        """
        Calculate quality/popularity score for a place
        Used to rank places by suitability for quests
        
        Args:
            place: Formatted place dictionary
            
        Returns:
            Score between 0.0 and 1.0 (higher is better)
        """
        score = 0.0
        
        # Rating contribution (0-5 stars) → 40% weight
        if place.get('rating'):
            normalized_rating = place['rating'] / 5.0
            score += normalized_rating * 0.4
        
        # Number of reviews → 30% weight
        # More reviews = more confidence in rating
        if place.get('user_ratings_total'):
            # Normalize: 100+ reviews = max score
            normalized_reviews = min(place['user_ratings_total'], 100) / 100.0
            score += normalized_reviews * 0.3
        
        # Business status → 20% weight
        if place.get('business_status') == 'OPERATIONAL':
            score += 0.2
        
        # Bonus for highly relevant types → 10% weight
        high_value_types = ['park', 'school', 'hospital', 'community_center']
        place_types = place.get('types', [])
        if any(hvt in place_types for hvt in high_value_types):
            score += 0.1
        
        return min(score, 1.0)  # Cap at 1.0
    
    def get_cache_stats(self) -> Dict:
        """Get cache statistics for monitoring"""
        return {
            "geocode_cache_size": self.reverse_geocode_cached.cache_info()._asdict()
        }
