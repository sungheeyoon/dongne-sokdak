# Bounds RPC Benchmark — 2026-07-24

## Purpose

Measure the effect of changing the active `/api/v1/reports/bounds` path from two
sequential database RPCs (`count` + `page`) to one combined RPC
(`items` + `total_count`).

This benchmark does **not** compare Python distance calculation with PostGIS.
It only evaluates the later `2 RPC → 1 RPC` change.

## Environment

| Item | Value |
| --- | --- |
| Before code | `edace9d` — `count_reports_in_bounds` + `get_reports_in_bounds` |
| After code | `fa97f02` — `get_reports_in_bounds_page` |
| Database | Same Supabase project for both runs |
| Reports at measurement time | 10,006 |
| Workload | 1,000 deterministic bounds (Gangnam 80%, Seoul 20%) |
| Load | 4 Locust workers, 20 concurrent users, spawn rate 4/s |
| Duration | 90 seconds per version |
| API runtime | One local Uvicorn process per version |
| Cache control | Worker-partitioned unique keys; 189 requests per run, so no key repeated |
| Failures | 0% in both runs |

Both versions were warmed once before measurement. Only the application code
changed; the database, seed data, load generator, query inputs, and machine were
kept the same.

## Concurrent Load Result

| Metric | Before: 2 RPC | After: 1 RPC | Change |
| --- | ---: | ---: | ---: |
| Requests | 189 | 189 | — |
| p50 | 8,700 ms | 8,600 ms | -1.1% |
| p99 | 19,000 ms | 21,000 ms | +10.5% |
| Average | 8,634 ms | 8,813 ms | +2.1% |
| RPS | 2.14 | 2.09 | -1.9% |
| Failure rate | 0% | 0% | 0%p |

Raw data:

- `bounds_before_2rpc_stats.csv`
- `bounds_before_2rpc_stats_history.csv`
- `bounds_before_2rpc_failures.csv`
- `bounds_before_2rpc_exceptions.csv`
- `bounds_after_1rpc_stats.csv`
- `bounds_after_1rpc_stats_history.csv`
- `bounds_after_1rpc_failures.csv`
- `bounds_after_1rpc_exceptions.csv`

## Low-load Diagnostic

To separate RPC network round-trip cost from database saturation, 15 identical
bounds were also called sequentially against Supabase PostgREST. Invocation
order alternated between the old pair and the new combined RPC.

| Metric | Before: 2 RPC | After: 1 RPC | Change |
| --- | ---: | ---: | ---: |
| p50 | 893 ms | 499 ms | -44.1% |
| p90 | 1,073 ms | 870 ms | -18.9% |
| Average | 931 ms | 532 ms | -42.9% |

This diagnostic confirms that one RPC removes meaningful network round-trip
cost at low load. It is not a user-facing API throughput result and must not be
presented as the concurrent-load improvement.

## Interpretation

- The combined RPC reduces database round trips from two to one.
- Under 20-user concurrent load, the database/query work is already saturated,
  so the saved round trip does not improve application throughput.
- The concurrent result does not support a new p50, p99, or RPS improvement
  claim. The p99 difference also requires repeated runs before treating it as a
  regression rather than run-to-run variance.
- Keep `2 RPC → 1 RPC` as an architectural/query-boundary result. Do not attach
  a production performance percentage until the SQL execution plan and
  aggregation cost are optimized and remeasured.

## Next Investigation

1. Capture `EXPLAIN (ANALYZE, BUFFERS)` for the count, page, and combined query.
2. Check whether vote/comment correlated aggregates dominate page execution.
3. Test a pre-aggregated join or maintained counter strategy.
4. Repeat at least three runs per variant and report median-of-runs.
