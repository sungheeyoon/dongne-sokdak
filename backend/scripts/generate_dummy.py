import asyncio
import os
import random
from typing import List, Dict, Any
from dotenv import load_dotenv
from supabase._async.client import AsyncClient, create_client
from faker import Faker

load_dotenv()

# Setup Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") # Use service role key for mass inserts bypassing RLS

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")
    exit(1)

fake = Faker('ko_KR')

# Constants
TARGET_COUNT = 10000
CHUNK_SIZE = 500
SKEW_PERCENTAGE = 0.8  # 80% of data will be clustered
CATEGORY_CHOICES = ['NOISE', 'TRASH', 'FACILITY', 'TRAFFIC', 'OTHER']
STATUS_CHOICES = ['OPEN', 'IN_PROGRESS', 'RESOLVED']

# Coordinates
SEOUL_CENTER_LAT, SEOUL_CENTER_LNG = 37.5665, 126.9780
SEOUL_RADIUS_DEGREE = 0.1  # Approx 10km radius

GANGNAM_STATION_LAT, GANGNAM_STATION_LNG = 37.4979, 127.0276
GANGNAM_RADIUS_DEGREE = 0.01  # Approx 1km radius (Highly skewed)

async def create_supabase_client() -> AsyncClient:
    return await create_client(SUPABASE_URL, SUPABASE_KEY)

def generate_random_location(center_lat: float, center_lng: float, radius: float) -> str:
    """Generate a random POINT string near the center."""
    lat = center_lat + random.uniform(-radius, radius)
    lng = center_lng + random.uniform(-radius, radius)
    return f"POINT({lng} {lat})"  # PostGIS is POINT(longitude latitude)

def generate_report_data(user_ids: List[str], use_skew: bool = False) -> Dict[str, Any]:
    """Generate a single fake report dictionary."""
    if use_skew and random.random() < SKEW_PERCENTAGE:
        # 80% of the time, generate data clustered in Gangnam
        location = generate_random_location(GANGNAM_STATION_LAT, GANGNAM_STATION_LNG, GANGNAM_RADIUS_DEGREE)
    else:
        # Extrapolate to wider Seoul
        location = generate_random_location(SEOUL_CENTER_LAT, SEOUL_CENTER_LNG, SEOUL_RADIUS_DEGREE)

    return {
        "user_id": random.choice(user_ids),
        "title": fake.catch_phrase(),
        "description": fake.text(max_nb_chars=200),
        "location": location,
        "address": fake.address(),
        "category": random.choice(CATEGORY_CHOICES),
        "status": random.choice(STATUS_CHOICES),
        # Assuming created_at defaults to NOW() if omitted, or we can spread them over time
        # "created_at": fake.date_time_between(start_date='-1y', end_date='now').isoformat()
    }

async def get_test_users(supabase: AsyncClient, needed_count: int = 10) -> List[str]:
    """Fetch or create some test users (assuming auth users exist, or we just grab their UUIDs)."""
    # For a real DB with Foreign Key constraints to auth.users, we MUST use real User UUIDs.
    print(f"Fetching {needed_count} users from auth.users (via profiles for simplicity)...")
    
    # Workaround: fetch active profile UUIDs
    res = await supabase.table("profiles").select("id").limit(needed_count).execute()
    user_ids = [row["id"] for row in res.data]
    
    if not user_ids:
        print("CRITICAL ERROR: No users found in the 'profiles' table.")
        print("Load testing requires at least one registered user to satisfy FK constraints.")
        print("Please register a user via the frontend first.")
        exit(1)
        
    return user_ids

async def main():
    print(f"--- Starting Data Seeding ({TARGET_COUNT} records) ---")
    supabase = await create_supabase_client()
    
    user_ids = await get_test_users(supabase)
    print(f"Loaded {len(user_ids)} users to assign reports to.")
    
    print(f"Generating data... (Skew factor: {SKEW_PERCENTAGE*100}% concentrated in Gangnam)")
    
    total_inserted = 0
    for chunk_start in range(0, TARGET_COUNT, CHUNK_SIZE):
        chunk_data = [generate_report_data(user_ids, use_skew=True) for _ in range(CHUNK_SIZE)]
        
        try:
            # Batch Insert
            response = await supabase.table("reports").insert(chunk_data).execute()
            inserted_count = len(response.data)
            total_inserted += inserted_count
            print(f"Inserted [{total_inserted}/{TARGET_COUNT}] records...")
            
        except Exception as e:
            print(f"Error inserting chunk at offset {chunk_start}: {e}")
            break

    print("--- Seeding Complete ---")

if __name__ == "__main__":
    asyncio.run(main())
