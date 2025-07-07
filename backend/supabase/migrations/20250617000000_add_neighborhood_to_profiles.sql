-- Add neighborhood column to profiles table
-- This allows users to set their neighborhood location

ALTER TABLE profiles 
ADD COLUMN neighborhood JSONB;

-- Add comment for documentation
COMMENT ON COLUMN profiles.neighborhood IS 'User neighborhood information including place_name, address, lat, lng';

-- Create index for better query performance on place_name
CREATE INDEX idx_profiles_neighborhood_place_name 
ON profiles USING GIN ((neighborhood->>'place_name'));

-- Example of neighborhood data structure:
-- {
--   "place_name": "부평역",
--   "address": "인천광역시 부평구 부평동", 
--   "lat": 37.4893,
--   "lng": 126.7229
-- }
