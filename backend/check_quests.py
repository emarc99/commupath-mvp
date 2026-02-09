import sqlite3

conn = sqlite3.connect('commupath.db')
cursor = conn.cursor()

# Get updated quests
cursor.execute("""
    SELECT title, location_name, location_lat, location_lng 
    FROM quests 
    ORDER BY created_at DESC 
    LIMIT 10
""")

print("\n📍 Latest 10 Quests:")
print("=" * 100)
for row in cursor.fetchall():
    title = row[0][:45]
    loc_name = row[1] or "No location name"
    lat = row[2]
    lng = row[3]
    print(f"{title:45} | {loc_name:35} | ({lat:.4f}, {lng:.4f})")

print("=" * 100)

# Count quests with location names
cursor.execute("SELECT COUNT(*) FROM quests WHERE location_name IS NOT NULL")
with_names = cursor.fetchone()[0]

cursor.execute("SELECT COUNT(*) FROM quests")
total = cursor.fetchone()[0]

print(f"\n✅ {with_names}/{total} quests have location names")
print(f"✅ Updates complete!")

conn.close()
