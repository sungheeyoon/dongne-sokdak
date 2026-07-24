"""Local FastAPI entrypoint wired to the temporary pre-inline benchmark RPC."""

from app.api.v1 import reports as report_routes
from app.db.supabase_client import supabase
from app.main import app
from app.services.report_service import ReportService
from app.services.spatial_report_cache import SpatialReportCache


BENCHMARK_RPC_NAME = "benchmark_get_reports_in_bounds_page_pre_inline"

report_routes.report_service = ReportService(
    supabase,
    SpatialReportCache(),
    bounds_rpc_name=BENCHMARK_RPC_NAME,
)
