import os
import polars as pl
import pymysql
from dotenv import load_dotenv

# --- CONFIGURATION ---
load_dotenv()  # Load environment variables from .env file
RANDOM_SEED = 42 
TSV_FILE = "title.basics.tsv"

# --- DATA PROCESSING (Happens Once) ---

print(f"Reading {TSV_FILE}...")
basics_df = pl.read_csv(
    TSV_FILE,
    separator="\t",
    null_values=["\\N"],
    infer_schema_length=0,
    quote_char=None
)

print(f"Sampling data (Seed: {RANDOM_SEED})...")
sampled_df = (
    basics_df
    .filter(pl.col("startYear").is_not_null())
    .sample(n=20000, shuffle=True, seed=RANDOM_SEED) 
)

def to_int_or_none(value):
    if value in [None, "", "null"]: return None
    try: return int(value)
    except ValueError: return None

# Prepare Lists
basics_all = [] # Node 1 (Master)
basics_lt  = [] # Node 2 (< 2000)
basics_gte = [] # Node 3 (>= 2000)

print("Cleaning and Sharding data in memory...")
for row in sampled_df.to_dicts():
    start_year = to_int_or_none(row["startYear"])
    genres_val = row["genres"] if row["genres"] not in [None, ""] else None

    row_tuple = (
        row["tconst"],
        row["titleType"],
        row["primaryTitle"][:255] if row["primaryTitle"] else None, # <--- Truncate to 255 chars
        row["originalTitle"][:255] if row["originalTitle"] else None, # <--- Truncate to 255 chars
        bool(int(row["isAdult"])) if row["isAdult"] not in [None, ""] else False,
        start_year,
        to_int_or_none(row["endYear"]),
        to_int_or_none(row["runtimeMinutes"]),
        genres_val 
    )

    # Sharding Logic
    basics_all.append(row_tuple)
    if start_year < 2000:
        basics_lt.append(row_tuple)
    else:
        basics_gte.append(row_tuple)

print(f"✅ Data Preparation Complete.")
print(f"   Master List: {len(basics_all)} rows")
print(f"   < 2000 List: {len(basics_lt)} rows")
print(f"   >= 2000 List: {len(basics_gte)} rows")
print("-" * 40)

# --- DATABASE UPLOAD FUNCTION ---

def upload_to_node(node_name, db_config, data):
    """Connects to a specific node and uploads the provided list of data."""
    if not data:
        print(f"No data to upload for {node_name}. Skipping.")
        return

    print(f"🔌 Connecting to {node_name} ({db_config['host']}:{db_config['port']})...")
    
    conn = None
    try:
        conn = pymysql.connect(**db_config)
        cursor = conn.cursor()

        print(f"Truncating 'title_basics' on {node_name}...")
        cursor.execute("SET FOREIGN_KEY_CHECKS = 0") 
        cursor.execute("TRUNCATE TABLE title_basics") 
        cursor.execute("SET FOREIGN_KEY_CHECKS = 1")

        insert_sql = """
            INSERT INTO title_basics (
                tconst, titleType, primaryTitle, originalTitle,
                isAdult, startYear, endYear, runtimeMinutes, genres
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """

        print(f"Inserting {len(data)} rows...")
        cursor.executemany(insert_sql, data)
        conn.commit()
        print(f"Success: {node_name} updated.")

    except pymysql.Error as e:
        print(f"Error on {node_name}: {e}")
        if conn: conn.rollback()
    except Exception as e:
        print(f"General Error on {node_name}: {e}")
    finally:
        if conn and conn.open:
            cursor.close()
            conn.close()
            print(f"Connection to {node_name} closed.")
    print("-" * 40)

# --- EXECUTION ---

# NODE 1: MASTER
config_node1 = {
    "host": os.getenv("NODE1_HOST"),
    "port": int(os.getenv("NODE1_PORT", 3306)),
    "user": os.getenv("NODE1_USER"),
    "password": os.getenv("NODE1_PASS"),
    "database": os.getenv("NODE1_DB")
}
# NODE 2: < 2000
config_node2 = {
    "host": os.getenv("NODE2_HOST"),
    "port": int(os.getenv("NODE2_PORT", 3306)),
    "user": os.getenv("NODE2_USER"),
    "password": os.getenv("NODE2_PASS"),
    "database": os.getenv("NODE2_DB")
}
# NODE 3: >= 2000
config_node3 = {
    "host": os.getenv("NODE3_HOST"),
    "port": int(os.getenv("NODE3_PORT", 3306)),
    "user": os.getenv("NODE3_USER"),
    "password": os.getenv("NODE3_PASS"),
    "database": os.getenv("NODE3_DB")
}

# Run the uploads
# You can comment out lines here if you want to skip a specific node temporarily
upload_to_node("NODE 1 (Master)", config_node1, basics_all)
upload_to_node("NODE 2 (< 2000)", config_node2, basics_lt)
upload_to_node("NODE 3 (>= 2000)", config_node3, basics_gte)

print("All operations finished.")