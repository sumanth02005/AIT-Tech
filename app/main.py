from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import analytics, complaints, tickets
from app.config import settings

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
    return {"status": "ok"}
