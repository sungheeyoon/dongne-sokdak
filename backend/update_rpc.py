import os
from dotenv import load_dotenv
import psycopg2
from urllib.parse import urlparse

# Load original .env
load_dotenv(".env")
DATABASE_URL = os.environ.get("DATABASE_URL")

# Resolve DB URL connection issue potentially
try:
    with open("supabase/migrations/20260226150000_add_search_to_rpc.sql", "r", encoding="utf-8") as f:
        sql = f.read()

    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cursor = conn.cursor()
    cursor.execute(sql)
    cursor.close()
    conn.close()
    print("Migration applied successfully!")
except Exception as e:
    print(f"Error: {e}")
