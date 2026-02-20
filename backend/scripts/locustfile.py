import random
from locust import HttpUser, task, between

# Constants matching the dummy data generator
SEOUL_CENTER_LAT, SEOUL_CENTER_LNG = 37.5665, 126.9780
SEOUL_RADIUS_DEGREE = 0.1  # Approx 10km radius

# For Testing Skewness Performance
GANGNAM_STATION_LAT, GANGNAM_STATION_LNG = 37.4979, 127.0276
GANGNAM_RADIUS_DEGREE = 0.05

class ReportUser(HttpUser):
    # Wait between 1 to 3 seconds between tasks
    wait_time = between(1, 3)

    def generate_random_location(self, center_lat, center_lng, radius):
        lat = center_lat + random.uniform(-radius, radius)
        lng = center_lng + random.uniform(-radius, radius)
        return lat, lng

    @task(3)  # Weight: 3 times more likely to run this than task(1)
    def view_nearby_gangnam_hotspot(self):
        """Simulate users frequently viewing reports in the Gangnam hotspot area."""
        lat, lng = self.generate_random_location(GANGNAM_STATION_LAT, GANGNAM_STATION_LNG, GANGNAM_RADIUS_DEGREE)
        
        # We query the backend endpoint to test the spatial resolution
        self.client.get(
            f"/api/v1/reports/nearby?lat={lat}&lng={lng}&radius_km=3.0&limit=50",
            name="GET /nearby (Gangnam Hotspot)"
        )

    @task(1)
    def view_nearby_random_seoul(self):
        """Simulate users viewing reports in random parts of broader Seoul."""
        lat, lng = self.generate_random_location(SEOUL_CENTER_LAT, SEOUL_CENTER_LNG, SEOUL_RADIUS_DEGREE)
        
        self.client.get(
            f"/api/v1/reports/nearby?lat={lat}&lng={lng}&radius_km=5.0&limit=50",
            name="GET /nearby (Random Seoul)"
        )

    @task(1)
    def view_reports_in_bounds(self):
        """Simulate map-panning users requesting boundary box areas."""
        lat, lng = self.generate_random_location(SEOUL_CENTER_LAT, SEOUL_CENTER_LNG, SEOUL_RADIUS_DEGREE)
        # Create a small bounding box
        north = lat + 0.02
        south = lat - 0.02
        east = lng + 0.02
        west = lng - 0.02

        self.client.get(
            f"/api/v1/reports/bounds?north={north}&south={south}&east={east}&west={west}&limit=100",
            name="GET /bounds (Random Box)"
        )
