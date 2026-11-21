from supabase import Client, create_client

from app.config import settings


def get_supabase() -> Client:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured")
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def create_signed_url(supabase: Client, path: str, expires_in: int = 3600) -> str:
    response = supabase.storage.from_(settings.supabase_bucket).create_signed_url(
        path,
        expires_in,
    )
    if isinstance(response, dict):
        return response.get("signedURL") or response.get("signedUrl") or ""
    return getattr(response, "signed_url", "") or getattr(response, "signedURL", "")

