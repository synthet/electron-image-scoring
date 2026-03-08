import sys
import os
import firebird.driver
from firebird.driver import driver_config

# Use network DSN for the one the server is likely using
restored_dsn = r'localhost:D:\Projects\image-scoring\SCORING_HISTORY.FDB'
corrupted_dsn = r'D:\Projects\image-scoring\SCORING_HISTORY.FDB.corrupted'
# Wait, for direct file access (embedded) we use the path. 
# For the corrupted one, we WANT to try direct access to bypass any server issues.

# Set client library path (relative to image-scoring project)
fb_client_lib = r'D:\Projects\image-scoring\Firebird\fbclient.dll'
if os.path.exists(fb_client_lib):
    driver_config.fb_client_library.value = fb_client_lib
    print(f"Using client library: {fb_client_lib}")
else:
    print(f"WARNING: Client library NOT FOUND at {fb_client_lib}")

user = 'sysdba'
password = 'masterkey'

def get_counts(path):
    print(f"\nConnecting to: {path}")
    try:
        # Use local file access (embedded) for specific comparison
        # Important: the path must be accessible to firebird-driver
        conn = firebird.driver.connect(path, user=user, password=password, charset='UTF8')
        c = conn.cursor()
        
        # Check table names first
        c.execute("SELECT RDB$RELATION_NAME FROM RDB$RELATIONS WHERE RDB$SYSTEM_FLAG = 0 AND RDB$VIEW_BLR IS NULL")
        tables = [row[0].strip() for row in c.fetchall()]
        print(f"Tables found: {tables}")
        
        results = {}
        for table in tables:
            try:
                c.execute(f"SELECT COUNT(*) FROM {table}")
                count = c.fetchone()[0]
                results[table] = count
                print(f"  {table}: {count}")
            except Exception as e:
                print(f"  Error querying {table}: {e}")
                results[table] = "Error"
        
        # Try to get max ID if IMAGES exists
        if 'IMAGES' in tables:
            c.execute("SELECT MAX(ID) FROM IMAGES")
            max_id = c.fetchone()[0]
            results['IMAGES_MAX_ID'] = max_id
            print(f"  IMAGES Max ID: {max_id}")
            
        conn.close()
        return results
    except Exception as e:
        print(f"Connection Failed: {e}")
        return None

print("Checking Restored Database (via localhost)...")
restored_data = get_counts(restored_dsn)

print("\nChecking Corrupted Database (via direct file access)...")
corrupted_data = get_counts(corrupted_dsn)

if restored_data and corrupted_data:
    print("\nComparison Summary:")
    print(f"{'Table':25} | {'Restored':10} | {'Corrupted':10} | {'Diff':10}")
    print("-" * 65)
    all_keys = set(restored_data.keys()) | set(corrupted_data.keys())
    for key in sorted(all_keys):
        if key == 'IMAGES_MAX_ID': continue
        r_count = restored_data.get(key, "N/A")
        c_count = corrupted_data.get(key, "N/A")
        diff = ""
        if isinstance(r_count, int) and isinstance(c_count, int):
            diff = f"{c_count - r_count:+d}"
        print(f"{key:25} | {str(r_count):10} | {str(c_count):10} | {diff:10}")
    
    # Show Max IDs
    r_max = restored_data.get('IMAGES_MAX_ID', "N/A")
    c_max = corrupted_data.get('IMAGES_MAX_ID', "N/A")
    print(f"\nIMAGES Max ID: Restored={r_max}, Corrupted={c_max}")
else:
    print("\nCould not complete comparison.")
