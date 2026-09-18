import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

conn = psycopg2.connect(os.getenv("SUPABASE_DB_URL"))
cursor = conn.cursor()

# Check all tables
tables = ['projects', 'products', 'suppliers', 'hardware_sets', 'customers']

for table in tables:
    cursor.execute(f"SELECT COUNT(*) FROM {table};")
    count = cursor.fetchone()[0]
    print(f"{table}: {count} rows")

conn.close()