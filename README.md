# CivicLens

CivicLens is a FastAPI backend for citizen complaint processing, AI-assisted classification,
duplicate detection, municipal ticket routing, and department workflow management.

## Structure

```text
app/
  api/          FastAPI route modules
  services/     AI, rules, embeddings, location, processing
  config.py     Environment settings
  db.py         Supabase service client
  main.py       Application entry point
  schemas.py    API request and response models
supabase/
  migrations/   PostGIS and pgvector database schema
tests/          Focused backend logic tests
```

## Setup

1. Install Python 3.11+.
2. Copy `.env.example` to `.env` and configure Supabase and Gemini.
3. Run the Supabase migration from `supabase/migrations/202611210001_civiclens.sql`.
4. Create the `complaint-evidence` Supabase Storage bucket.
5. Install dependencies:

```powershell
python -m pip install -e ".[test]"
```

6. Start the API:

```powershell
python -m uvicorn app.main:app --reload
```

Open `http://127.0.0.1:8000/docs`.

## Key API routes

- `POST /api/complaints` - submit text, GPS, and optional image
- `GET /api/complaints/{complaint_id}` - retrieve one complaint
- `GET /api/tickets` - priority-sorted officer dashboard data
- `PATCH /api/tickets/{ticket_id}` - assign or update ticket status
- `GET /api/analytics/summary` - operational summary

## Processing flow

Complaints are saved immediately, then processed in FastAPI background tasks:
location extraction, Gemini analysis, deterministic rules, embedding generation,
PostGIS/pgvector duplicate detection, incident/ticket creation, and audit logging.
Gemini and the embedding model have explicit fallbacks so local development can start
without external credentials.
