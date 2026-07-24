from pathlib import Path


MIGRATION_PATH = (
    Path(__file__).parents[1]
    / "supabase"
    / "migrations"
    / "20260724_optimize_bounds_filter_inlining.sql"
)
BENCHMARK_SQL_DIR = Path(__file__).parents[1] / "scripts" / "sql"
CREATE_BENCHMARK_RPC_PATH = (
    BENCHMARK_SQL_DIR / "create_bounds_pre_inline_benchmark_rpc.sql"
)
DROP_BENCHMARK_RPC_PATH = (
    BENCHMARK_SQL_DIR / "drop_bounds_pre_inline_benchmark_rpc.sql"
)
BENCHMARK_RPC_NAME = "benchmark_get_reports_in_bounds_page_pre_inline"


def test_active_bounds_rpc_inlines_optional_filters():
    sql = MIGRATION_PATH.read_text(encoding="utf-8")

    assert "CREATE OR REPLACE FUNCTION public.get_reports_in_bounds_page" in sql
    assert "report_matches_filters" not in sql
    assert (
        sql.count("category_filter IS NULL OR r.category::text = category_filter")
        == 2
    )
    assert sql.count("r.title ILIKE '%' || search_query || '%'") == 2
    assert sql.count("r.description ILIKE '%' || search_query || '%'") == 2


def test_pre_inline_benchmark_rpc_has_matching_cleanup_script():
    create_sql = CREATE_BENCHMARK_RPC_PATH.read_text(encoding="utf-8")
    drop_sql = DROP_BENCHMARK_RPC_PATH.read_text(encoding="utf-8")

    assert f"CREATE OR REPLACE FUNCTION public.{BENCHMARK_RPC_NAME}" in create_sql
    assert create_sql.count("public.report_matches_filters") == 2
    assert "CREATE OR REPLACE FUNCTION public.get_reports_in_bounds_page" not in create_sql
    assert f"DROP FUNCTION IF EXISTS public.{BENCHMARK_RPC_NAME}" in drop_sql
