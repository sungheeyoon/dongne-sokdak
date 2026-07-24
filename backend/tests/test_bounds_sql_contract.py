from pathlib import Path


MIGRATION_PATH = (
    Path(__file__).parents[1]
    / "supabase"
    / "migrations"
    / "20260724_optimize_bounds_filter_inlining.sql"
)


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
