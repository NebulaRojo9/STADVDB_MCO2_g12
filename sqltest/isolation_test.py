import pymysql
import threading
import time
import os
from dotenv import load_dotenv

load_dotenv()

# --- CONFIGURATION ---
# Target Node (Defaulting to Node 1/Master for the test)
DB_HOST = os.getenv("NODE1_HOST")
DB_PORT = int(os.getenv("NODE1_PORT", 3306))
DB_USER = os.getenv("NODE1_USER")
DB_PASS = os.getenv("NODE1_PASS")
DB_NAME = os.getenv("NODE1_DB")

# The row we will use for testing
TEST_ID = "tt1234567" 
ORIGINAL_TITLE = "Should be in B"
PHANTOM_CATEGORY = "TestCat"
ISOLATION_LEVELS = [
    'READ UNCOMMITTED',
    'READ COMMITTED',
    'REPEATABLE READ',
    'SERIALIZABLE'
]

TEST_SCENARIOS = ["Read-Read", "Read-Write", "Write-Write"]

# --- HELPER FUNCTIONS ---

def get_connection():
    return pymysql.connect(
        host=DB_HOST, port=DB_PORT, user=DB_USER, password=DB_PASS, database=DB_NAME,
        autocommit=False # We handle commits manually
    )

def reset_data():
    """
    Resets data on Master (Node A). 
    In a real cluster, we sleep briefly to ensure Node B (Replica) catches up.
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    # 1. Reset the Single Row
    cursor.execute("UPDATE title_basics SET primaryTitle = %s WHERE tconst = %s", (ORIGINAL_TITLE, TEST_ID))
    
    # 2. Reset the Range Data (Delete phantoms from previous runs)
    cursor.execute("DELETE FROM title_basics WHERE genres = %s", (PHANTOM_CATEGORY,))
    
    conn.commit()
    conn.close()
    
    # Wait for replication lag (Simulating consistency for Node B)
    time.sleep(0.5)

# --- TEST WORKERS ---

def worker_read_read(iso_level, thread_name, delay=0):
    time.sleep(delay)
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(f"SET SESSION TRANSACTION ISOLATION LEVEL {iso_level}")
        conn.begin()
        cursor.execute("SELECT primaryTitle FROM title_basics WHERE tconst = %s", (TEST_ID,))
        res = cursor.fetchone()
        print(f"   [{thread_name}] Read: '{res[0]}'")
        conn.commit()
    except Exception as e:
        print(f"   [{thread_name}] Error: {e}")
    finally:
        conn.close()

def worker_read_write_reader(iso_level):
    """Reads, waits for writer to finish, reads again."""
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(f"SET SESSION TRANSACTION ISOLATION LEVEL {iso_level}")
        conn.begin()
        
        # First Read
        cursor.execute("SELECT primaryTitle FROM title_basics WHERE tconst = %s", (TEST_ID,))
        res1 = cursor.fetchone()
        print(f"   [Reader] 1st Read: '{res1[0]}'")
        
        time.sleep(2) # Wait for the writer to change it
        
        # Second Read
        cursor.execute("SELECT primaryTitle FROM title_basics WHERE tconst = %s", (TEST_ID,))
        res2 = cursor.fetchone()
        print(f"   [Reader] 2nd Read: '{res2[0]}' (Same? {res1[0] == res2[0]})")
        
        conn.commit()
    except Exception as e:
        print(f"   [Reader] Error: {e}")
    finally:
        conn.close()

def worker_read_write_writer():
    """Updates and commits quickly."""
    time.sleep(0.5) # Let reader start first
    conn = get_connection()
    cursor = conn.cursor()
    try:
        conn.begin()
        print("   [Writer] Updating title to 'MODIFIED' and Committing...")
        cursor.execute("UPDATE title_basics SET primaryTitle = 'MODIFIED' WHERE tconst = %s", (TEST_ID,))
        conn.commit()
    except Exception as e:
        print(f"   [Writer] Error: {e}")
    finally:
        conn.close()

def worker_write_write_A(iso_level):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(f"SET SESSION TRANSACTION ISOLATION LEVEL {iso_level}")
        conn.begin()
        print("   [Tx A] Updating title (Holding Lock)...")
        cursor.execute("UPDATE title_basics SET primaryTitle = 'TxA_Was_Here' WHERE tconst = %s", (TEST_ID,))
        time.sleep(3) # Hold the lock
        print("   [Tx A] Committing now.")
        conn.commit()
    except Exception as e:
        print(f"   [Tx A] Error: {e}")
    finally:
        conn.close()

def worker_write_write_B(iso_level):
    time.sleep(0.5) # Ensure A starts first
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(f"SET SESSION TRANSACTION ISOLATION LEVEL {iso_level}")
        conn.begin()
        print("   [Tx B] Trying to Update... (Should Block)")
        start_time = time.time()
        cursor.execute("UPDATE title_basics SET primaryTitle = 'TxB_Was_Here' WHERE tconst = %s", (TEST_ID,))
        end_time = time.time()
        print(f"   [Tx B] Update successful! Waited {end_time - start_time:.2f}s")
        conn.commit()
    except Exception as e:
        print(f"   [Tx B] Error: {e}")
    finally:
        conn.close()

def worker_phantom_reader(iso_level):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(f"SET SESSION TRANSACTION ISOLATION LEVEL {iso_level}")
        conn.begin()
        
        # 1st Count
        cursor.execute("SELECT COUNT(*) FROM title_basics WHERE genres = %s", (PHANTOM_CATEGORY,))
        res1 = cursor.fetchone()[0]
        print(f"   [Reader] 1st Count: {res1} rows")
        
        time.sleep(2) # Wait for writer to insert a new row
        
        # 2nd Count
        cursor.execute("SELECT COUNT(*) FROM title_basics WHERE genres = %s", (PHANTOM_CATEGORY,))
        res2 = cursor.fetchone()[0]
        
        is_phantom_prevented = (res1 == res2)
        print(f"   [Reader] 2nd Count: {res2} rows (Phantom Prevented? {is_phantom_prevented})")
        
        conn.commit()
    except Exception as e:
        print(f"   [Reader] Error: {e}")
    finally:
        conn.close()

def worker_phantom_writer():
    time.sleep(0.5) # Let reader start
    conn = get_connection()
    cursor = conn.cursor()
    try:
        conn.begin()
        print("   [Writer] Inserting new 'Phantom' row...")
        # Inserting a NEW row that matches the reader's WHERE clause
        new_id = "tt7654321"
        cursor.execute(
            "INSERT INTO title_basics (tconst, primaryTitle, genres) VALUES (%s, 'Phantom Row', %s)", 
            (new_id, PHANTOM_CATEGORY)
        )
        conn.commit()
        print("   [Writer] Committed.")
    except Exception as e:
        print(f"   [Writer] Error (Likely blocked by Serializable): {e}")
    finally:
        conn.close()

# --- MAIN CONTROLLER ---

def run_suite():
    print(f"STARTING ISOLATION LEVEL TEST SUITE")
    print(f"Target: {DB_HOST} | ID: {TEST_ID}")
    
    for level in ISOLATION_LEVELS:
        print("\n" + "="*60)
        print(f"TESTING ISOLATION LEVEL: {level}")
        print("="*60)

        # --- SCENARIO 1: READ - READ ---
        print(f"\n--- Test Case 1: Read-Read (Should be concurrent) ---")
        reset_data()
        t1 = threading.Thread(target=worker_read_read, args=(level, "Thread 1", 0))
        t2 = threading.Thread(target=worker_read_read, args=(level, "Thread 2", 0.2))
        t1.start(); t2.start()
        t1.join(); t2.join()

        # --- SCENARIO 2: READ - WRITE ---
        print(f"\n--- Test Case 2: Read-Write (Testing Repeatability) ---")
        reset_data()
        t1 = threading.Thread(target=worker_read_write_reader, args=(level,))
        t2 = threading.Thread(target=worker_read_write_writer)
        t1.start(); t2.start()
        t1.join(); t2.join()

        # --- SCENARIO 3: WRITE - WRITE ---
        print(f"\n--- Test Case 3: Write-Write (Testing Locking) ---")
        reset_data()
        t1 = threading.Thread(target=worker_write_write_A, args=(level,))
        t2 = threading.Thread(target=worker_write_write_B, args=(level,))
        t1.start(); t2.start()
        t1.join(); t2.join()

        # --- SCENARIO 4: PHANTOM READS ---
        # This is the only test that distinguishes Repeatable Read from Serializable
        print(f"\n--- Test Case 4: Phantom Reads (Range Query) ---")
        reset_data()
        
        # Insert one initial row so the count isn't always 0
        conn = get_connection()
        conn.cursor().execute("INSERT INTO title_basics (tconst, primaryTitle, genres) VALUES ('tt_init', 'Init', %s)", (PHANTOM_CATEGORY,))
        conn.commit()
        conn.close()

        t1 = threading.Thread(target=worker_phantom_reader, args=(level,))
        t2 = threading.Thread(target=worker_phantom_writer)
        
        t1.start(); t2.start()
        t1.join(); t2.join()

    print("\nFull Test Suite Complete.")

if __name__ == "__main__":
    run_suite()