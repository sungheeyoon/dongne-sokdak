"""Compare Locust stats CSV files for the active bounds endpoint."""

from __future__ import annotations

import argparse
import csv
from dataclasses import dataclass
from pathlib import Path
from typing import Dict


DEFAULT_REQUEST_NAME = "GET /api/v1/reports/bounds"


@dataclass(frozen=True)
class Metrics:
    p50_ms: float
    p99_ms: float
    rps: float
    failure_rate: float


def read_metrics(path: Path, request_name: str = DEFAULT_REQUEST_NAME) -> Metrics:
    with path.open(encoding="utf-8-sig", newline="") as stats_file:
        rows = list(csv.DictReader(stats_file))

    row = next((candidate for candidate in rows if candidate["Name"] == request_name), None)
    if row is None:
        available = ", ".join(candidate["Name"] for candidate in rows)
        raise ValueError(f"{request_name!r} not found in {path}. Available: {available}")

    request_count = int(row["Request Count"])
    failure_count = int(row["Failure Count"])
    failure_rate = (failure_count / request_count * 100) if request_count else 0.0

    return Metrics(
        p50_ms=float(row["50%"]),
        p99_ms=float(row["99%"]),
        rps=float(row["Requests/s"]),
        failure_rate=failure_rate,
    )


def _percent_change(before: float, after: float) -> float:
    if before == 0:
        return 0.0
    return (after - before) / before * 100


def compare_metrics(before: Metrics, after: Metrics) -> Dict[str, float]:
    return {
        "p50_change_percent": _percent_change(before.p50_ms, after.p50_ms),
        "p99_change_percent": _percent_change(before.p99_ms, after.p99_ms),
        "rps_change_percent": _percent_change(before.rps, after.rps),
        "failure_rate_point_change": after.failure_rate - before.failure_rate,
    }


def render_markdown(before: Metrics, after: Metrics) -> str:
    changes = compare_metrics(before, after)
    return "\n".join(
        [
            "| Metric | Before | After | Change |",
            "| --- | ---: | ---: | ---: |",
            (
                f"| p50 | {before.p50_ms:.0f} ms | {after.p50_ms:.0f} ms | "
                f"{changes['p50_change_percent']:+.1f}% |"
            ),
            (
                f"| p99 | {before.p99_ms:.0f} ms | {after.p99_ms:.0f} ms | "
                f"{changes['p99_change_percent']:+.1f}% |"
            ),
            (
                f"| RPS | {before.rps:.2f} | {after.rps:.2f} | "
                f"{changes['rps_change_percent']:+.1f}% |"
            ),
            (
                f"| Failure rate | {before.failure_rate:.2f}% | {after.failure_rate:.2f}% | "
                f"{changes['failure_rate_point_change']:+.2f}%p |"
            ),
        ]
    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Compare before/after Locust *_stats.csv files for bounds queries."
    )
    parser.add_argument("--before", required=True, type=Path)
    parser.add_argument("--after", required=True, type=Path)
    parser.add_argument("--name", default=DEFAULT_REQUEST_NAME)
    args = parser.parse_args()

    print(
        render_markdown(
            read_metrics(args.before, args.name),
            read_metrics(args.after, args.name),
        )
    )


if __name__ == "__main__":
    main()
