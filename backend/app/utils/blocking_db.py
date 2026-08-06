"""Keep blocking supabase-py calls off the event loop.

supabase-py's `Client` is synchronous. Calling `.execute()` directly inside an
`async def` route or service blocks the whole event loop, so a single Uvicorn
process serialises every concurrent request onto one thread — under load the
response time becomes pure queueing (N users / throughput) rather than actual
work. Routing each query through the threadpool keeps the loop free so requests
overlap on the network round trip to Supabase.
"""

from typing import Any

from starlette.concurrency import run_in_threadpool


async def execute(query: Any) -> Any:
    """Run a blocking supabase-py query builder off the event loop."""
    return await run_in_threadpool(query.execute)
