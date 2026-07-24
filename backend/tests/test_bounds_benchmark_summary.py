from pathlib import Path

import pytest

from scripts.summarize_bounds_benchmark import compare_metrics, read_metrics


CSV_HEADER = (
    "Type,Name,Request Count,Failure Count,Median Response Time,"
    "Average Response Time,Min Response Time,Max Response Time,"
    "Average Content Size,Requests/s,Failures/s,50%,66%,75%,80%,"
    "90%,95%,98%,99%,99.9%,99.99%,100%\n"
)


def write_stats(path: Path, *, p50: int, p99: int, rps: float, failures: int) -> None:
    row = (
        f"GET,GET /api/v1/reports/bounds,100,{failures},{p50},80,10,200,"
        f"1000,{rps},0,{p50},70,80,85,90,95,98,{p99},120,150,200\n"
    )
    path.write_text(CSV_HEADER + row, encoding="utf-8")


def test_reads_named_bounds_metrics_and_compares_before_after(tmp_path: Path):
    before_path = tmp_path / "before_stats.csv"
    after_path = tmp_path / "after_stats.csv"
    write_stats(before_path, p50=100, p99=110, rps=10.0, failures=2)
    write_stats(after_path, p50=73, p99=100, rps=11.5, failures=0)

    before = read_metrics(before_path, "GET /api/v1/reports/bounds")
    after = read_metrics(after_path, "GET /api/v1/reports/bounds")
    comparison = compare_metrics(before, after)

    assert before.failure_rate == pytest.approx(2.0)
    assert comparison["p50_change_percent"] == pytest.approx(-27.0)
    assert comparison["p99_change_percent"] == pytest.approx(-9.09, abs=0.01)
    assert comparison["rps_change_percent"] == pytest.approx(15.0)
    assert comparison["failure_rate_point_change"] == pytest.approx(-2.0)
