from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import analytics, complaints, tickets
from app.config import settings
from app.db import get_supabase

app = FastAPI(title="CivicLens API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(complaints.router)
app.include_router(tickets.router)
app.include_router(analytics.router)


@app.get("/health")
async def health():
    services = {
        "supabase_postgis": False,
        "pgvector": False,
        "celery_redis": False,
        "gemini_pro": False,
        "laya_decisions": False,
        "sentence_transformers": False,
    }

    try:
        supabase = get_supabase()
        supabase.table("tickets").select("id").limit(1).execute()
        services["supabase_postgis"] = True
        services["pgvector"] = True
    except Exception:
        pass

    if settings.gemini_api_key and settings.gemini_api_key not in {"replace-me", "MY_GEMINI_API_KEY"}:
        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.gemini_api_key)
            model = genai.GenerativeModel(settings.gemini_model)
            model.generate_content(
                "Return only: healthy",
                generation_config={"max_output_tokens": 8},
            )
            services["gemini_pro"] = True
            services["laya_decisions"] = True
        except Exception:
            pass

    try:
        from app.services.embeddings import _model
        services["sentence_transformers"] = _model() is not None
    except Exception:
        pass

    return {
        "status": "ok",
        "services": services,
    }
