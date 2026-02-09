"""
Update existing quests with accurate coordinates from Google Maps Places API

This script:
1. Fetches all quests with duplicate/default coordinates
2. Uses Google Places API to find real nearby locations
3. Updates quests with accurate coordinates and location names
4. Spreads quests across different real places in Ibadan

Run: python update_quest_coordinates.py
"""

import asyncio
import sqlite3
import os
from dotenv import load_dotenv
from typing import List, Dict
from location_service import LocationService
from models import Coordinates

# Load environment variables
load_dotenv()

# Default hardcoded coordinate that old quests likely have
DEFAULT_COORDS = (7.3775, 3.9470)  # Ibadan center

def get_quests_to_update() -> List[Dict]:
    """Get all quests from database that need coordinate updates"""
    conn = sqlite3.connect('commupath.db')
    cursor = conn.cursor()
    
    # Get all quests
    cursor.execute("""
        SELECT quest_id, title, description, category, difficulty, 
               location_lat, location_lng, location_name, location_address
        FROM quests
        ORDER BY created_at ASC
    """)
    
    quests = []
    for row in cursor.fetchall():
        quests.append({
            'quest_id': row[0],
            'title': row[1],
            'description': row[2],
            'category': row[3],
            'difficulty': row[4],
            'location_lat': row[5],
            'location_lng': row[6],
            'location_name': row[7],
            'location_address': row[8]
        })
    
    conn.close()
    return quests

def update_quest_location(quest_id: str, lat: float, lng: float, name: str, address: str):
    """Update a quest's location in the database"""
    conn = sqlite3.connect('commupath.db')
    cursor = conn.cursor()
    
    cursor.execute("""
        UPDATE quests 
        SET location_lat = ?, 
            location_lng = ?,
            location_name = ?,
            location_address = ?
        WHERE quest_id = ?
    """, (lat, lng, name, address, quest_id))
    
    conn.commit()
    conn.close()

async def assign_unique_locations(quests: List[Dict], location_service: LocationService):
    """Assign unique real locations to quests based on their category"""
    
    # Group quests by category
    quests_by_category = {
        'Environment': [],
        'Education': [],
        'Health': [],
        'Social': []
    }
    
    for quest in quests:
        category = quest.get('category', 'Environment')
        if category in quests_by_category:
            quests_by_category[category].append(quest)
    
    print("\n📊 Quest Distribution:")
    for cat, cat_quests in quests_by_category.items():
        print(f"   {cat}: {len(cat_quests)} quests")
    
    # Find nearby places for each category
    center = Coordinates(lat=DEFAULT_COORDS[0], lng=DEFAULT_COORDS[1])
    
    for category, cat_quests in quests_by_category.items():
        if not cat_quests:
            continue
        
        print(f"\n🔍 Finding {category} locations...")
        
        # Get nearby places for this category
        nearby_places = await location_service.find_nearby_places(
            center_coords=center,
            category=category,
            radius=5000,  # 5km radius
            max_results=20  # More options
        )
        
        if not nearby_places:
            print(f"   ⚠️  No places found for {category}, using default coordinates")
            continue
        
        print(f"   ✅ Found {len(nearby_places)} {category} locations")
        
        # Assign each quest a unique location
        for i, quest in enumerate(cat_quests):
            # Cycle through available places
            place = nearby_places[i % len(nearby_places)]
            
            # Update quest coordinates
            update_quest_location(
                quest_id=quest['quest_id'],
                lat=place['coordinates'].lat,
                lng=place['coordinates'].lng,
                name=place['name'],
                address=place.get('address', '')
            )
            
            print(f"   📍 Updated '{quest['title'][:50]}...' → {place['name']}")
    
    print("\n✅ All quests updated successfully!")

async def main():
    """Main execution function"""
    print("=" * 70)
    print("🗺️  QUEST COORDINATE UPDATE SCRIPT")
    print("=" * 70)
    
    # Initialize location service
    print("\n🔧 Initializing Google Maps service...")
    location_service = LocationService()
    
    if not location_service.gmaps:
        print("❌ Google Maps API not configured!")
        print("   Please set GOOGLE_MAPS_API_KEY in .env file")
        return
    
    print("✅ Google Maps service ready")
    
    # Get quests to update
    print("\n📋 Fetching quests from database...")
    quests = get_quests_to_update()
    
    if not quests:
        print("ℹ️  No quests found in database")
        return
    
    print(f"✅ Found {len(quests)} total quests")
    
    # Filter quests that need updating (default coords or no location name)
    quests_to_update = [
        q for q in quests 
        if (abs(q['location_lat'] - DEFAULT_COORDS[0]) < 0.01 and 
            abs(q['location_lng'] - DEFAULT_COORDS[1]) < 0.01) or 
           not q['location_name']
    ]
    
    if not quests_to_update:
        print("\n✅ All quests already have unique coordinates!")
        return
    
    print(f"📝 {len(quests_to_update)} quests need coordinate updates")
    print(f"✅ {len(quests) - len(quests_to_update)} quests already have unique locations")
    
    # Ask for confirmation
    print("\n⚠️  This will update quest coordinates with real locations from Google Maps")
    response = input("Continue? (y/n): ").strip().lower()
    
    if response != 'y':
        print("❌ Update cancelled")
        return
    
    # Assign unique locations
    await assign_unique_locations(quests_to_update, location_service)
    
    print("\n" + "=" * 70)
    print("🎉 UPDATE COMPLETE!")
    print("=" * 70)
    print("\n📊 Summary:")
    print(f"   • Total quests in database: {len(quests)}")
    print(f"   • Quests updated: {len(quests_to_update)}")
    print(f"   • Quests already unique: {len(quests) - len(quests_to_update)}")
    print("\n💡 Refresh your browser to see quests at their new locations!")

if __name__ == "__main__":
    asyncio.run(main())
