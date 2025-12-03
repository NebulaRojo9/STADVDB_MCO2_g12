import pymysql
import os
from dotenv import load_dotenv

load_dotenv()

# --- THE TEST DATA ---
TEST_ROW = {
  "tconst": "tt1234567",
  "titleType": "movie",
  "primaryTitle": "Test Movie to A",
  "originalTitle": "Should be in B",
  "isAdult": True,
  "startYear": 1995,
  "endYear": None,
  "runtimeMinutes": 120,
  "genres": "Drama"
}

# --- CONFIGURATION ---
NODES = {
    "NODE1": {
        "host": os.getenv("NODE1_HOST"),
        "port": int(os.getenv("NODE1_PORT", 3306)),
        "user": os.getenv("NODE1_USER"),
        "password": os.getenv("NODE1_PASS"),
        "database": os.getenv("NODE1_DB"),
        "name": "Node 1 (Master)"
    },
    "NODE2": {
        "host": os.getenv("NODE2_HOST"),
        "port": int(os.getenv("NODE2_PORT", 3306)),
        "user": os.getenv("NODE2_USER"),
        "password": os.getenv("NODE2_PASS"),
        "database": os.getenv("NODE2_DB"),
        "name": "Node 2 (< 2000)"
    },
    "NODE3": {
        "host": os.getenv("NODE3_HOST"),
        "port": int(os.getenv("NODE3_PORT", 3306)),
        "user": os.getenv("NODE3_USER"),
        "password": os.getenv("NODE3_PASS"),
        "database": os.getenv("NODE3_DB"),
        "name": "Node 3 (>= 2000)"
    }
}

def insert_row(node_key):
    config = NODES[node_key]
    print(f"🔌 Connecting to {config['name']}...")
    
    conn = None
    try:
        conn = pymysql.connect(
            host=config['host'], port=config['port'], 
            user=config['user'], password=config['password'], 
            database=config['database']
        )
        cursor = conn.cursor()

        # Delete if exists (Cleanup previous runs)
        cursor.execute("DELETE FROM title_basics WHERE tconst = %s", (TEST_ROW["tconst"],))

        insert_sql = """
            INSERT INTO title_basics (
                tconst, titleType, primaryTitle, originalTitle,
                isAdult, startYear, endYear, runtimeMinutes, genres
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        values = (
            TEST_ROW["tconst"], TEST_ROW["titleType"], TEST_ROW["primaryTitle"], 
            TEST_ROW["originalTitle"], TEST_ROW["isAdult"], TEST_ROW["startYear"], 
            TEST_ROW["endYear"], TEST_ROW["runtimeMinutes"], TEST_ROW["genres"]
        )

        cursor.execute(insert_sql, values)
        conn.commit()
        print(f"Inserted 'tt1234567' into {config['name']}")

    except Exception as e:
        print(f"Error on {config['name']}: {e}")
    finally:
        if conn: conn.close()

# --- EXECUTION LOGIC ---
print(f"SEEDING TEST ROW: {TEST_ROW['tconst']}")
print("-" * 40)

# 1. ALWAYS insert into Master (Node 1)
insert_row("NODE1")

# 2. Check Sharding Logic for Nodes 2 & 3
year = TEST_ROW["startYear"]

if year < 2000:
    print(f"🔎 Logic Check: {year} < 2000. Routing to Node 2.")
    insert_row("NODE2")
else:
    print(f"🔎 Logic Check: {year} >= 2000. Routing to Node 3.")
    insert_row("NODE3")

print("-" * 40)
print("🎉 Setup Complete.")