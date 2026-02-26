import random
from locust import HttpUser, task, between

# Only test Gangnam area to clearly show the difference between Index and Full Scan
GANGNAM_STATION_LAT, GANGNAM_STATION_LNG = 37.4979, 127.0276
GANGNAM_RADIUS_DEGREE = 0.05

class BenchmarkReportUser(HttpUser):
    wait_time = between(1, 3)

    def generate_random_location(self, center_lat, center_lng, radius):
        lat = center_lat + random.uniform(-radius, radius)
        lng = center_lng + random.uniform(-radius, radius)
        return lat, lng

    @task(1)
    def bench_v1_rest(self):
        """[V1] REST + Python Haversine (Very Slow Network I/O + CPU Iteration)"""
        lat, lng = self.generate_random_location(GANGNAM_STATION_LAT, GANGNAM_STATION_LNG, GANGNAM_RADIUS_DEGREE)
        self.client.get(
            f"/api/v1/reports/benchmark/nearby-rest?lat={lat}&lng={lng}&radius_km=3.0&limit=50",
            name="[V1] REST + Python Haversine"
        )

    @task(1)
    def bench_v3_rpc_fast(self):
        """[V3] RPC Index Scan (Current Fast DB Query)"""
        lat, lng = self.generate_random_location(GANGNAM_STATION_LAT, GANGNAM_STATION_LNG, GANGNAM_RADIUS_DEGREE)
        self.client.get(
            f"/api/v1/reports/nearby?lat={lat}&lng={lng}&radius_km=3.0&limit=50",
            name="[V3] Fast RPC (Index Scan)"
        )
