import os

# Set dummy environment variables for testing before anything else is loaded
os.environ["SUPABASE_URL"] = "https://example.supabase.co"
os.environ["SUPABASE_KEY"] = "dummy-key"
os.environ["JWT_SECRET"] = "test-secret"
os.environ["ENVIRONMENT"] = "testing"
