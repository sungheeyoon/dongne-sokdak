# Bounds Event-Loop Benchmark — 2026-08-04

## Purpose

Investigate why the 2026-07-24 bounds benchmark showed an API `p50` of
7.6–8.8 seconds even though a representative `EXPLAIN (ANALYZE, BUFFERS)` run
measured the active combined SQL at 16.0 ms, and measure the effect of moving
the synchronous Supabase call off the event loop.

This follow-up asks a different question from the earlier report:

- [`BOUNDS_RPC_BENCHMARK_20260724.md`](./BOUNDS_RPC_BENCHMARK_20260724.md)
  asks whether the SQL and RPC boundary became cheaper.
- This report asks whether one local Uvicorn process can overlap concurrent
  requests while it waits for Supabase.

The 2026-07-24 database result remains valid for the representative query plan:
count `55.8 ms → 6.6 ms`, combined SQL `125.8 ms → 16.0 ms`. Its API result was
a real observation of latency under the tested 20-user load, but it was not a
clean estimate of the SQL change's end-to-end effect because the application
was already queueing requests on a blocked event loop.

## Evidence boundary

| Claim | Status | Evidence |
| --- | --- | --- |
| The 62 service-layer Supabase calls blocked the event loop | Supported | Source count at the pre-fix HEAD and a minimal concurrent reproduction |
| Offloading the call restored request overlap in the tested local setup | Supported | Three blocking runs vs three threadpool runs, plus the minimal reproduction |
| The exact `12.6×` throughput change generalises to production | Not supported | Single local API process, shared remote Supabase, synthetic workload |
| The remaining single-request time is entirely network or PostgREST | Not isolated | It also includes client, transfer, application transformation, validation, and response serialization |
| A half-closed keep-alive connection caused all 20 exploratory failures | Not independently verified | The retained CSV records HTTP 400 responses but not their response bodies or server logs |

## The discrepancy

The earlier report compared two measurement layers and two load conditions:

| Measurement | Result | Scope |
| --- | ---: | --- |
| Representative combined SQL plan | 16.0 ms | Database execution for one Gangnam viewport |
| Bounds API under 20-user closed load | 7,600 ms `p50` | End-to-end local API latency, including queueing |

Dividing these figures gives `475×`, but that ratio is an investigation trigger,
not an API-overhead measurement: the SQL value is one representative database
plan, while the API value is a percentile across a concurrent workload.

The earlier low-load diagnostic had already measured the combined PostgREST RPC
at a `p50` of 499 ms. That made a 7–8 second `p50` under 20 users difficult to
explain with SQL alone and justified a separate concurrency experiment.

## Diagnostic cross-check

Locust used a closed workload: 20 users, with a constant 0.2-second wait between
completed requests. The interactive response-time form of Little's Law is:

```text
R ≈ N / X − Z

N: concurrent users
X: throughput
Z: think time
R: response time
```

Applied to the published three-run medians:

```text
pre-inline  : 20 / 2.09 − 0.2 = 9.37 s   (reported average 8.835 s)
post-inline : 20 / 2.40 − 0.2 = 8.13 s   (reported average 7.614 s)
```

The estimates are about 6–7% above the recorded averages. Ramp-up, terminal
in-flight requests, and run variance prevent an exact equality, so this check
does not prove serialization by itself. It does show that most of the measured
latency behaved like closed-loop queueing.

The implied serialized service times, `1 / X`, are approximately 478 ms and
417 ms. Those values are close to the earlier 499 ms low-load RPC measurement.
That agreement produced the testable hypothesis: one synchronous upstream call
was occupying the event loop, so each local process could make progress on only
one bounds request at a time.

## Root cause

`supabase-py`'s `Client` is synchronous. Before the change, all 62 Supabase
`.execute()` calls in `app/services/` ran directly inside coroutine-based
services. Another three calls existed in `app/middleware/admin_auth.py` and one
in `app/main.py`, for 66 direct calls in total.

```python
async def get_reports_in_bounds(self, ...):
    response = self._supabase.rpc(self._bounds_rpc_name, params).execute()
```

The service layer did contain unrelated `await` expressions, mainly for admin
activity helpers. The precise defect was that none of the 62 Supabase
`.execute()` calls was awaited or offloaded. A synchronous network call inside
the event-loop thread prevents that process from advancing other coroutines
during the wait.

### Minimal code-level reproduction

Twenty concurrent tasks each executed a synthetic 50 ms blocking query on
2026-08-04:

| Variant | Total time for 20 tasks |
| --- | ---: |
| Direct synchronous call inside the coroutine | 1.074 s |
| `app.utils.blocking_db.execute()` | 0.069 s |

This small reproduction isolates the scheduling mechanism from Supabase. It
does not replace the endpoint benchmark, but it confirms that the helper allows
blocking waits to overlap instead of serializing them on the loop.

## Fix

1. [`app/utils/blocking_db.py`](../../app/utils/blocking_db.py) runs
   `query.execute` through `starlette.concurrency.run_in_threadpool`.
2. The 66 direct call sites were changed to `await execute(<query>)`.
3. `ReportService._apply_user_voted` and `_overlay_user_voted` became
   coroutines so their batched vote query could also be offloaded.
4. [`app/db/supabase_client.py`](../../app/db/supabase_client.py) supplies an
   explicit synchronous `httpx.Client`. Its exploratory connection-pool result
   is reported separately because it is not isolated by the main A/B comparison.

## Main A/B environment

| Item | Value |
| --- | --- |
| Blocking baseline | Same application code, helper calling `query.execute()` directly |
| Threadpool variant | Helper calling `run_in_threadpool(query.execute)` |
| Database | Same shared Supabase project |
| Reports in representative Gangnam viewport | 8,603 |
| Workload | 1,000 deterministic bounds from `scripts/locustfile_bounds.py` |
| Load | 4 partitioned Locust workers, 20 users, spawn rate 4/s |
| Duration | 90 seconds per run, three runs per variant |
| API runtime | One local Uvicorn process on port 8010 |
| Load generator | Locust 2.32.10 |
| HTTP client | Same explicit client configuration for both main variants |
| Run order | Three threadpool runs, followed by three blocking runs |

Both variants were warmed before measurement. The blocking baseline was made by
temporarily changing only the helper implementation; that temporary switch was
removed after measurement. The switch and exact launch commands were not
retained in the repository, so the raw CSVs preserve the result but the exact
baseline procedure is not directly rerunnable from the current checkout.

The workload contains 1,000 bounds and the application cache has a 15-second
TTL. At the median threadpool throughput, a full input cycle takes about 34.8
seconds (`1,000 / 28.70`), so a repeated key should expire before reuse. Cache
hit/miss counts were not instrumented, however, so this remains a workload-based
control rather than a directly observed cache metric.

## Sequential single-request diagnostic

Fifteen distinct bounds were called one at a time. The summary recorded during
the experiment was:

| Metric | Value |
| --- | ---: |
| p50 | 503 ms |
| p90 | 830 ms |
| Average | 597 ms |
| Min / Max | 277 ms / 867 ms |

The individual samples were not retained as a raw artifact. The result is
consistent with the earlier 499 ms low-load diagnostic and shows that non-SQL
time dominates this local-to-remote request path. It does not isolate that time
into network, PostgREST, client, application transformation, response validation,
and serialization components.

## Concurrent load result

| Variant | Run | Requests | p50 | p99 | Average | RPS | Failures |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Blocking | 1 | 198 | 8,700 ms | 10,000 ms | 8,112 ms | 2.30 | 0 |
| Blocking | 2 | 197 | 8,500 ms | 13,000 ms | 8,344 ms | 2.27 | 0 |
| Blocking | 3 | 112 | 13,000 ms | 22,000 ms | 13,742 ms | 1.33 | 0 |
| Threadpool | 1 | 2,584 | 430 ms | 1,200 ms | 477 ms | 28.70 | 0 |
| Threadpool | 2 | 2,590 | 430 ms | 1,200 ms | 474 ms | 28.87 | 0 |
| Threadpool | 3 | 2,074 | 460 ms | 2,100 ms | 644 ms | 23.10 | 0 |

| Metric | Blocking, three-run median | Threadpool, three-run median | Change |
| --- | ---: | ---: | ---: |
| p50 | 8,700 ms | 430 ms | −95.1% |
| p99 | 13,000 ms | 1,200 ms | −90.8% |
| Average | 8,344 ms | 477 ms | −94.3% |
| RPS | 2.27 | 28.70 | +1,163% (`12.6×`) |
| Failure rate | 0% | 0% | 0%p |

Blocking run 3 and threadpool run 3 were both slower than their first two runs.
Neither was discarded. Reporting the median limits the influence of one slow
run, but three runs are too few to estimate a confidence interval.

The threadpool `p50` of 430 ms is in the same range as the 503 ms sequential
diagnostic. Its lower value should be treated as input and upstream variance,
not as evidence that concurrency makes an individual request faster. Combined
with the source inspection and minimal reproduction, the large reduction in
concurrent latency supports the conclusion that most of the former 7–13 second
response time was event-loop queueing.

Raw data:

- Blocking: [`run1`](./bounds_blocking_run1_stats.csv),
  [`run2`](./bounds_blocking_run2_stats.csv),
  [`run3`](./bounds_blocking_run3_stats.csv)
- Threadpool: [`run1`](./bounds_threadpool_run1_stats.csv),
  [`run2`](./bounds_threadpool_run2_stats.csv),
  [`run3`](./bounds_threadpool_run3_stats.csv)

<a id="connection-pool-a-second-fault-that-only-appears-once-requests-overlap"></a>

## Exploratory connection-client follow-up

Before the explicit `httpx.Client` configuration, one threadpool run recorded:

| Variant | Requests | p50 | p99 | Average | RPS | Failures |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Threadpool, default client | 2,131 | 570 ms | 1,400 ms | 623 ms | 23.71 | 20 (0.94%) |

All 20 failures appeared in the final seconds of the run. The retained
[`failures CSV`](./bounds_threadpool_unpooled_run1_failures.csv) identifies them
as HTTP 400 responses from the bounds endpoint. The endpoint wraps upstream
exceptions as HTTP 400, but the CSV does not store the response body and the
corresponding server log was not retained. Therefore the more specific
`Server disconnected` message cannot be independently recovered from the saved
artifact.

The following run used a custom synchronous client with:

- `max_connections=20`
- `max_keepalive_connections=10`
- `keepalive_expiry=5.0`
- transport connection retries set to 2

The subsequent three main threadpool runs recorded no failures. This is useful
follow-up evidence, but it is not a controlled pool benchmark: only one default-
client run was captured, several client settings changed together, and the run
order was not interleaved. The filename `unpooled` means “without the custom pool
configuration”; the default `httpx` client still has its own connection pool.
The current evidence therefore supports “failures were not reproduced after the
client configuration changed,” not “a particular half-closed keep-alive defect
was proven and fixed.”

Raw data: [`default-client run`](./bounds_threadpool_unpooled_run1_stats.csv)

## Interpretation

- The repeated benchmark was justified because the earlier SQL benchmark and
  concurrent API benchmark answered different questions, and their difference
  exposed a larger application-level bottleneck.
- The 2026-07-24 API values were real for that saturated, serialized setup. They
  should not be quoted as an isolated or general end-to-end benefit of filter
  inlining.
- The 2026-07-24 database-plan result remains the evidence for filter inlining.
- In this local single-process experiment, offloading synchronous Supabase I/O
  removed most event-loop queueing and increased median throughput from 2.27 to
  28.70 RPS.
- `12.6×`, `95.1%`, and `90.8%` are benchmark results for this environment, not
  production improvements or an SLA.
- The connection-client follow-up is provisional and should not be presented as
  a proven root-cause analysis until it is repeated with stronger artifacts.

## Verification

- Pre-fix source count: 62 service `.execute()` calls, 3 middleware calls, and
  1 application health-check call.
- Current source count: 66 `await execute(...)` call sites and no direct
  Supabase `.execute()` call under `backend/app/` outside the helper.
- Backend test suite on 2026-08-04: 151 passed, 1 dependency deprecation warning.
- There is no dedicated automated test that measures event-loop responsiveness
  or validates the custom client limits; the endpoint benchmark and minimal
  reproduction are the current regression evidence.

## Limitations

- Local single-process Uvicorn against a shared remote Supabase project with
  synthetic data; not a production traffic result.
- The deployed start command uses multiple Gunicorn workers, which was not
  measured here. The defect is still per-process, but the exact production
  impact cannot be inferred from this single-process result.
- All threadpool runs preceded all blocking runs, so shared-upstream time effects
  were not balanced through interleaving.
- Three runs per main variant are enough to show a large local effect but not to
  produce a stable confidence interval.
- The temporary blocking switch, exact launch commands, and sequential raw
  samples were not retained, limiting exact reproduction.
- Cache hit/miss counts were not instrumented.
- Locust does not run in CI, so these numbers are not protected by an automated
  performance regression gate.

## Remaining investigation

1. Retain a benchmark launcher that can switch only the execution strategy,
   record dependency versions, and run interleaved `A/B/B/A` trials.
2. Add cache hit/miss counters and preserve the sequential samples, response
   bodies, and API logs with each run.
3. Repeat the client experiment with at least three runs per variant, change one
   pool setting at a time, and preserve the upstream exception body.
4. Sweep concurrency to find the next limit in the AnyIO threadpool, HTTP client,
   and Supabase project.
5. Measure multiple Uvicorn/Gunicorn workers separately from the single-process
   case.
6. Decompose the remaining single-request time across connection setup/reuse,
   Supabase/PostgREST, payload transfer, application transformation, validation,
   and serialization.
