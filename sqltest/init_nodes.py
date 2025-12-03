import os
import pymysql
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# The Schema provided
TABLE_SCHEMA = """
CREATE TABLE title_basics (
  tconst VARCHAR(10) PRIMARY KEY,
  titleType VARCHAR(50), 
  primaryTitle VARCHAR(255), 
  originalTitle VARCHAR(255), 
  isAdult BOOLEAN, 
  startYear INT, 
  endYear INT, 
  runtimeMinutes INT, 
  genres VARCHAR(255)
);
"""

def get_node_config(node_prefix):
    """Extracts config for a specific node from env vars."""
    try:
        return {
            "host": os.getenv(f"{node_prefix}_HOST"),
            "user": os.getenv(f"{node_prefix}_USER"),
            "password": os.getenv(f"{node_prefix}_PASS"),
            "port": int(os.getenv(f"{node_prefix}_PORT", 3306)),
            "db_name": os.getenv(f"{node_prefix}_DB")
        }
    except ValueError:
        return None # Handle missing or partial configs gracefully

def reset_node(node_name, config):
    if not config["host"]: 
        print(f"⚠️  Skipping {node_name}: Configuration missing in .env")
        return

    print(f"🔄 Connecting to {node_name} ({config['host']})...")

    try:
        # Connect to the MySQL Server (not the specific DB yet, in case it doesn't exist)
        connection = pymysql.connect(
            host=config["host"],
            user=config["user"],
            password=config["password"],
            port=config["port"],
            cursorclass=pymysql.cursors.DictCursor
        )

        with connection.cursor() as cursor:
            # 1. Create Database if it doesn't exist
            print(f"   - Creating/Selecting DB: {config['db_name']}")
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS {config['db_name']}")
            cursor.execute(f"USE {config['db_name']}")

            # 2. Drop old table
            print(f"   - Dropping old 'title_basics' table...")
            cursor.execute("DROP TABLE IF EXISTS title_basics")

            # 3. Create new table
            print(f"   - Creating new schema...")
            cursor.execute(TABLE_SCHEMA)
        
        connection.commit()
        print(f"✅ {node_name} setup complete.\n")

    except Exception as e:
        print(f"❌ Error on {node_name}: {e}\n")
    finally:
        if 'connection' in locals() and connection.open:
            connection.close()

def main():
    # Define the nodes based on your .env structure
    nodes = [
        ("NODE 1 (Master)", get_node_config("NODE1")),
        ("NODE 2 (Fragment A)", get_node_config("NODE2")),
        ("NODE 3 (Fragment B)", get_node_config("NODE3")),
    ]

    print("--- STARTING DATABASE INITIALIZATION ---\n")
    
    for name, config in nodes:
        reset_node(name, config)
        
    print("--- ALL OPERATIONS FINISHED ---")

if __name__ == "__main__":
    main()