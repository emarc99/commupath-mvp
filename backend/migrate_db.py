"""
Database migration script to add location_name and location_address columns
Run this to update existing database schema
"""

import sqlite3
import os

def migrate_database():
    """Add new location columns to quests table"""
    
    db_path = "commupath.db"
    
    if not os.path.exists(db_path):
        print(f"❌ Database not found at {db_path}")
        return
    
    print(f"📊 Migrating database: {db_path}")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(quests)")
        columns = [row[1] for row in cursor.fetchall()]
        
        # Add location_name if it doesn't exist
        if 'location_name' not in columns:
            print("   Adding column: location_name")
            cursor.execute("""
                ALTER TABLE quests 
                ADD COLUMN location_name VARCHAR(255)
            """)
            print("   ✅ Added location_name")
        else:
            print("   ℹ️  Column location_name already exists")
        
        # Add location_address if it doesn't exist
        if 'location_address' not in columns:
            print("   Adding column: location_address")
            cursor.execute("""
                ALTER TABLE quests 
                ADD COLUMN location_address VARCHAR(500)
            """)
            print("   ✅ Added location_address")
        else:
            print("   ℹ️  Column location_address already exists")
        
        conn.commit()
        print("\n✅ Database migration completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        conn.rollback()
        raise
        
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_database()
