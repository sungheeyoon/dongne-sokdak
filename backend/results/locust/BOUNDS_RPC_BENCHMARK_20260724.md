# Bounds RPC Benchmark — 2026-07-24

## Purpose

Measure the effect of changing the active `/api/v1/reports/bounds` path from two
sequential database RPCs (`count` + `page`) to one combined RPC
(`items` + `total_count`).

This benchmark does **not** compare Python distance calculation with PostGIS.
It starts with the later `2 RPC → 1 RPC` change and then records the execution
plan investigation and optional-filter inlining follow-up.

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

## Follow-up: Optional Filter Inlining

The first benchmark showed that removing one network round trip was not enough
under concurrent load. A live `EXPLAIN (ANALYZE, BUFFERS)` then isolated the
database work using a representative Gangnam viewport containing 8,039 of
10,006 reports.

Votes and comments were ruled out as the current bottleneck: the live dataset
contained only 2 votes and 0 comments, and both `report_id` indexes existed.
The GiST index found the 8,039 spatial candidates in about 1 ms. Most of the
count time was spent invoking the shared optional-filter function once per
candidate, even when category and search were both `NULL`.

| Database measurement | Shared helper | Inline predicates | Change |
| --- | ---: | ---: | ---: |
| Count query | 55.8 ms | 6.6 ms | -88.2% |
| Combined SQL, 3-run median | 125.8 ms | 16.0 ms | -87.3% |

Migration `20260724_optimize_bounds_filter_inlining.sql` keeps the spatial
predicate unchanged and inlines the category/search predicates inside the
active `get_reports_in_bounds_page` RPC. This lets PostgreSQL remove inactive
filters and choose a plan based on the actual bounds selectivity.

Post-migration smoke checks also exercised both optional filters against live
data. The category response returned 100/100 `NOISE` items, and the generated
search term returned 137 matches with every returned item satisfying the title
or description predicate.

### Concurrent API Result

Both variants were measured three times with Locust 2.32.10 under the same
workload: 4 workers, 20 users, spawn rate 4/s, 90 seconds, and
worker-partitioned deterministic bounds.

The pre-inline variant ran through a temporary benchmark RPC with the old
`report_matches_filters` calls. A local FastAPI entrypoint injected only the
benchmark RPC name, so the active live RPC did not need to be reverted. Before
measurement, the benchmark and active functions returned the same total
(8,039), page size (100), and first item for the representative viewport. The
temporary RPC was removed after all runs and its absence was verified.

| Variant | Run | Requests | p50 | p99 | Average | RPS | Failures |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Pre-inline helper | 1 | 186 | 8,900 ms | 21,000 ms | 8,835 ms | 2.09 | 0 |
| Pre-inline helper | 2 | 177 | 8,800 ms | 23,000 ms | 9,142 ms | 1.99 | 0 |
| Pre-inline helper | 3 | 191 | 8,700 ms | 17,000 ms | 8,503 ms | 2.14 | 0 |
| Post-inline | 1 | 206 | 7,700 ms | 19,000 ms | 7,995 ms | 2.31 | 0 |
| Post-inline | 2 | 226 | 7,300 ms | 16,000 ms | 7,339 ms | 2.52 | 0 |
| Post-inline | 3 | 214 | 7,600 ms | 16,000 ms | 7,614 ms | 2.40 | 0 |

| Metric | Pre-inline 3-run median | Post-inline 3-run median | Change |
| --- | ---: | ---: | ---: |
| p50 | 8,800 ms | 7,600 ms | -13.6% |
| p99 | 21,000 ms | 16,000 ms | -23.8% |
| Average | 8,835 ms | 7,614 ms | -13.8% |
| RPS | 2.09 | 2.40 | +15.0% |
| Failure rate | 0% | 0% | 0%p |

Raw follow-up data:

- `bounds_filter_helper_run1_*`
- `bounds_filter_helper_run2_*`
- `bounds_filter_helper_run3_*`
- `bounds_filter_inline_run1_*`
- `bounds_filter_inline_run2_*`
- `bounds_filter_inline_run3_*`

This controlled local-API/shared-Supabase benchmark supports reporting the
three-run median changes above. It used deterministic synthetic data and is not
evidence of production traffic latency or an SLA.

## Remaining Investigation

1. Keep the pinned load-generator version in future benchmark metadata.
2. Investigate the remaining 7-8 second saturation latency separately from the
   now-fixed optional-filter function cost.
