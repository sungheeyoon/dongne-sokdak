import httpx
from supabase.client import create_client, Client, ClientOptions
from app.core.config import settings

# Requests now reach Supabase concurrently (see app/utils/blocking_db.py), so the
# shared client's connection pool sits on the hot path. An unbounded pool lets a
# burst open more upstream connections than PostgREST keeps alive, and threads
# then pick up half-closed ones ("Server disconnected"). Bound the pool and retry
# connection-level failures.
_POOL_LIMITS = httpx.Limits(
    max_connections=20,
    max_keepalive_connections=10,
    keepalive_expiry=5.0,
)


def _build_httpx_client() -> httpx.Client:
    return httpx.Client(
        limits=_POOL_LIMITS,
        timeout=httpx.Timeout(30.0),
        transport=httpx.HTTPTransport(limits=_POOL_LIMITS, retries=2),
        follow_redirects=True,
    )


def get_supabase_client() -> Client:
    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_KEY,
        options=ClientOptions(httpx_client=_build_httpx_client()),
    )


supabase = get_supabase_client()
