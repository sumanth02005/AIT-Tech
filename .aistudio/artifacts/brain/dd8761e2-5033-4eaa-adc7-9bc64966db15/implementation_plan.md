# CivicLens — AI Triage & Municipal Operations Platform

CivicLens transforms unstructured, multilingual citizen reports (text, photo, GPS/EXIF location) into verified, deduplicated, priority-scored, and department-routed municipal tickets with full auditability, interactive geospatial mapping, and operational analytics. This revised blueprint updates all seven project documents—PRD, TRD, App Flow, UI/UX Brief, Backend Scheme, Implementation Plan, and Phase-by-Phase Build—to match your complete FastAPI + Celery + Supabase + Gemini Pro + Laya Typed Decisions + React/TypeScript architecture.

---

## Current Workspace Inspection & Status

Before drafting the revised plan, the existing workspace was inspected:
- **Runtime & Framework**: Fresh React 19 + TypeScript + Vite 8 + Tailwind CSS v4 template (`lucide-react` and `motion` installed; `@google/genai` and `express` present in workspace dependencies).
- **Current Implementation State**: The application entry is an empty shell (`<div></div>`) with default HTML metadata. No CivicLens components, mapping libraries, EXIF parsers, Supabase clients, or FastAPI backend files exist yet.
- **Architectural Boundary**: Because this workspace hosts the React + TypeScript frontend while your team builds the Python FastAPI + Celery + Supabase backend services in parallel, the frontend will implement a strict, modular API and Realtime adapter layer with **clearly labeled Live Backend vs. Simulated Demonstration Modes**—never disguising mock responses as live Gemini Pro or Laya model outputs.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Confirm or adjust these architectural defaults before we begin incremental frontend implementation.

- **Interactive Mapping Library**: Use **Leaflet** with OpenStreetMap tiles and custom GeoJSON/heatmap overlays via a clean React map wrapper. *Why*: Zero API-key friction during multi-team development, native support for PostGIS Lat/Lng pin picking, configurable duplicate radius rings, and hotspot density visualization without billing quotas. (Can be swapped to Google Maps behind the same map component boundary if desired.)
- **Authentication & Role-Based Access (RBAC)**: Support three distinct roles—**Citizen**, **Municipal Officer**, and **Administrator**—via Supabase Auth / JWT integration when live, paired with a clearly labeled **Demo Role Switcher** in demonstration mode so reviewers can test Citizen submission, Officer triage/verification, and Admin analytics/rules seamlessly.
- **Data Provenance Transparency**: Every ticket card, AI classification panel, and duplicate match score will display an explicit provenance label (`Live Gemini Pro + Laya Output` vs. `Simulated Demo Pipeline — Backend Disconnected`) to strictly satisfy Requirement #10 (no fabricated AI outputs).

---

## 1. Product Requirements Document (PRD)

### 1.1 Product Vision & Problem Statement
Municipal corporations receive thousands of unstructured, multilingual civic complaints daily across portals and messaging channels. Critical life-safety hazards (exposed live wires near schools, collapsed drains, major water main ruptures) are delayed by vague descriptions, duplicate filings, and manual misrouting. CivicLens automates intake, EXIF/GPS location capture, multimodal AI triage, independent policy verification, geospatial + semantic deduplication, department dispatch, resolution tracking, and executive analytics.

### 1.2 User Roles & Access Control (RBAC)
| Role | Permitted Views & Capabilities | Restricted Actions |
| :--- | :--- | :--- |
| **Citizen** | Submit complaints (title, description, photo, contact, GPS/map pin), view own submitted complaints, track ticket lifecycle (`OPEN → CLOSED`), view public resolution notes & evidence | Cannot view other citizens' private contact details, override AI decisions, or access officer triage queues |
| **Municipal Officer** | View priority-sorted triage queue & interactive complaint map, inspect AI/Laya reasoning & disagreements, review `Uncertain Match` duplicate flags, reassign departments, transition lifecycle (`OPEN → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED`), upload resolution notes & evidence | Cannot alter system-wide Python Rules Engine policies or manage officer role permissions |
| **Administrator** | All Officer capabilities + **Analytics & Monitoring** console (department SLAs, hotspots, duplicate rates, AI disagreement rates), full system audit log viewer, and department/policy oversight | Audited on every administrative override |

### 1.3 Core Functional Requirements (11-Stage Pipeline)
1. **Citizen Complaint Submission**: Collect complaint title, multilingual free-text description, optional image upload, contact details, and location via browser GPS detection, image EXIF extraction, or manual interactive map pin selection. Generate a unique human-readable complaint/ticket code immediately.
2. **Backend Processing & Async Orchestration**: FastAPI validates payloads, persists initial complaint + Supabase Storage image, and dispatches a Celery + Redis background job so the citizen UI receives an instant receipt while tracking real-time pipeline progress.
3. **Location Extraction (PostGIS)**: Priority order: (1) Image EXIF GPS metadata, (2) Browser Geolocation API coordinates + accuracy radius, (3) Manual map click selection. Persist `latitude`, `longitude`, `accuracy_meters`, `location_source`, and PostGIS `geography(Point, 4326)`.
4. **Multimodal AI Classification (Gemini Pro)**: Analyze multilingual text + uploaded image to extract structured JSON: category, severity (`critical | high | medium | low`), hazard flags, concise English summary, recommended department, detected language, and confidence scores.
5. **Independent Decision Evaluation (Laya Typed Decisions + Python Rules Engine)**: Run Laya Typed Decisions independently from Gemini Pro, apply deterministic Python policy rules (e.g., electrical hazard near school/hospital → mandatory `CRITICAL` escalation), detect model disagreements or low confidence, and flag `needs_human_review = true` when thresholds fail.
6. **Semantic Embedding Generation**: Generate multilingual Sentence Transformer vectors (e.g., 384/768-dim) from normalized/multilingual text and store in Supabase `pgvector`.
7. **Geospatial + Semantic Duplicate Detection**: Query PostGIS within a configurable radius (e.g., 250m) + `pgvector` cosine similarity + category/time window + image evidence comparison to compute `duplicate_likelihood` and branch cleanly:
   - **Likely Duplicate**: Link new complaint to existing incident (`linked_incident_id`) while preserving the original citizen complaint record intact.
   - **New Complaint**: Create a standalone incident ticket.
   - **Uncertain Match**: Create/hold with `duplicate_review_status = 'uncertain'` so an Officer manually confirms `"Merge"` or `"Keep Separate"`.
8. **Ticket Creation & Priority Assignment**: Map categories to municipal departments, compute deterministic priority score from severity, public impact, location sensitivity (school/hospital/arterial road), and waiting time, and trigger separate critical-hazard escalation alerts.
9. **Officer Dashboard**: Overview metrics (`Total`, `Open/Pending`, `In Progress`, `Resolved/Closed`), priority-sorted queue, interactive geographic complaint map, full evidence & EXIF viewer, AI vs. Laya comparison panel, duplicate cluster verification controls, and department assignment.
10. **Department Action & 5-Stage Lifecycle**: Enforce `OPEN → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED` transitions with mandatory resolution description & optional evidence image on resolution, citizen notifications, and immutable audit logs.
11. **Analytics & Monitoring**: Visualize total, resolved/pending counts, department-wise distribution, average resolution time, critical/high hazard load, geographic complaint hotspots, recurring incident clusters, duplicate merge statistics, and department SLA performance.

---

## 2. Technical Requirements Document (TRD)

### 2.1 Technology Stack Alignment
| Layer | Technology | Responsibility |
| :--- | :--- | :--- |
| **Frontend** | React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Motion | Modular SPA with RBAC views, EXIF client preview + GPS/Map picker, live triage progress, officer console, analytics charts |
| **Interactive Mapping** | Leaflet (OpenStreetMap tiles, vector markers, radius circles, hotspot layer) | Manual citizen pin drop, officer complaint map, PostGIS radius visualization, geographic hotspot view |
| **Backend API** | Python FastAPI (Pydantic v2 schemas, JWT/Supabase Auth middleware) | Input validation, EXIF parsing (`Pillow`/`exifread`), REST endpoints, RBAC enforcement, audit logging |
| **Async Workers** | Celery + Redis | Non-blocking AI pipeline execution (Gemini Pro → Laya → Rules → Embeddings → Duplicate Check) |
| **AI & Policy** | Gemini Pro, Laya Typed Decisions, Python Rules Engine, Multilingual Sentence Transformers | Multimodal understanding, independent typed decision evaluation, safety overrides, multilingual vector embeddings |
| **Database & Infra** | Supabase (PostgreSQL, PostGIS, pgvector, Storage, Realtime) | Relational storage, geospatial radius queries, vector similarity search, image bucket, live ticket/status streaming |

### 2.2 Architectural Invariants & Non-Functional Requirements
- **Strict Separation of Concerns**: Frontend handles UI state, form validation, client GPS/EXIF preview, map rendering, and typed API/Realtime consumption; Backend handles FastAPI routing and auth; Worker layer handles AI/embedding compute; Database handles PostGIS/pgvector persistence.
- **No Silent Data Loss on Duplicates**: Every citizen submission creates an immutable row in `complaints`; merging only links `complaints.incident_id` to an existing `tickets` record so citizen history and evidence are never discarded.
- **Auditability**: Every AI output, Laya disagreement, human override (severity/category/department/duplicate resolution), and lifecycle transition writes an append-only row in `audit_logs`.
- **Resilient Provenance Separation**: Frontend API client checks backend `/api/health` and live Supabase configuration. When running without live credentials, UI displays a clear `"Demonstration Mode (Simulated Pipeline — Not Live AI)"` banner and marks simulated records distinctly from live Gemini/Laya payloads.

---

## 3. End-to-End Application Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                       CIVICLENS UNIFIED WORKSPACE                            │
│  [CivicLens]   [Submit Issue | Track Status | Officer Desk | Analytics] [Role]│
└──────────────────────────────────────────────────────────────────────────────┘
       │                    │                       │                   │
       ▼                    ▼                       ▼                   ▼
┌──────────────┐    ┌───────────────┐    ┌──────────────────┐   ┌──────────────┐
│ 1. CITIZEN   │    │ 2. TRACKER    │    │ 3. OFFICER DESK  │   │ 4. ANALYTICS │
│    INTAKE    │    │    & ALERTS   │    │    & MAP CONSOLE │   │    MONITOR   │
├──────────────┤    ├───────────────┤    ├──────────────────┤   ├──────────────┤
│• Auth/Guest  │    │• Search ID    │    │• KPI Overview    │   │• Volume & SLA│
│• Title/Desc  │    │• Live Pipeline│    │• Priority Queue  │   │• Dept Split  │
│  (Multiling.)│    │  Stepper      │    │• Interactive Map │   │• Hotspot Map │
│• Photo Upload│    │• Status Log   │    │• Uncertain Dup   │   │• Recurring & │
│• EXIF / GPS /│    │  OPEN->CLOSED │    │  Review Queue    │   │  Duplicates  │
│  Map Picker  │    │• Resolution   │    │• AI vs Laya Diff │   │• AI Review   │
└──────┬───────┘    │  Evidence     │    │• Lifecycle Edit  │   │  Rate        │
       │            └───────────────┘    └────────┬─────────┘   └──────────────┘
       │ POST /api/v1/complaints                  │ Click Ticket
       ▼                                          ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                     ASYNC PIPELINE & INSPECTION FLOW                         │
│                                                                              │
│  FastAPI Validate & Store ─► Celery Task ─► EXIF/GPS PostGIS Point           │
│         │                                        │                           │
│         ▼                                        ▼                           │
│  Instant Complaint ID              Gemini Pro Multimodal JSON                │
│  + Realtime Listener                             │                           │
│                                                  ▼                           │
│                                    Laya Typed Decisions + Rules Engine       │
│                                    (Check Disagreement / Safety Escalation)  │
│                                                  │                           │
│                                                  ▼                           │
│                                    Sentence Transformers ─► pgvector         │
│                                                  │                           │
│                                                  ▼                           │
│                                    PostGIS + pgvector Duplicate Check        │
│                                    ├── Likely Duplicate ─► Link Incident     │
│                                    ├── Uncertain Match  ─► Flag Manual Review│
│                                    └── New Complaint    ─► Create Ticket     │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Key Interactive User Flows
1. **Citizen Submission Flow**: Citizen opens `Submit Issue` → enters title, multilingual description, contact info, and optional photo → frontend inspects image EXIF preview (or requests Browser GPS) and centers the interactive Leaflet picker so citizen can confirm or drag the pin → submits → receives instant `complaint_id` and watches real-time pipeline stages settle (`Submitted → Analyzing Location & AI → Evaluating Policy → Duplicate Check → Routed`).
2. **Officer Triage & Verification Flow**: Officer opens `Officer Desk` → sees Critical/Escalated hazards pinned at top plus a toggleable/split interactive Leaflet map → sees badges for `Needs Human Review` (Gemini vs. Laya disagreement) and `Uncertain Duplicate` → opens Ticket Inspection Drawer to compare Gemini Pro vs. Laya Typed Decisions side-by-side, inspect linked citizen complaints, confirm/reject uncertain duplicate merges, reassign department, and advance lifecycle `OPEN → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED` with resolution notes + proof image.
3. **Admin Analytics & Monitoring Flow**: Administrator opens `Analytics` → reviews total/pending/resolved trends, average resolution times per department, critical/high hazard volume, geographic complaint hotspot map, recurring incident clusters, and duplicate merge savings.

---

## 4. UI/UX Brief & Design Constitution

- **Aesthetic Posture**: High-trust civic operations workspace built for rapid decision-making. Crisp daylight palette (`#F8FAFC` canvas, `#FFFFFF` structured panels, `1px solid #E2E8F0` hairline borders), zero nested card-in-card clutter, zero thick left accent stripes, and zero decorative pulsing dots.
- **Top Bar Contract**: Single-row, three-zone layout:
  1. **Brand Zone**: Single-line `CivicLens` wordmark (`Plus Jakarta Sans`, Bold).
  2. **Navigation Zone**: Role-aware single-line links (`Submit Issue`, `Track Status`, `Officer Desk`, `Analytics`).
  3. **Action Zone**: Single primary CTA (`+ Submit Complaint`) with role & connection provenance controls tucked cleanly in the workspace toolbar directly beneath the header.
- **Typography & Tabular Discipline**:
  - **Headings**: `Plus Jakarta Sans` (SemiBold 600 / Bold 700, balanced wrapping).
  - **Body & Controls**: `Public Sans` (Regular 400 / Medium 500, crisp legibility across dense tables and forms).
  - **IDs, Coordinates, Confidence, Timestamps & Metrics**: `JetBrains Mono` with `tabular-nums`.
- **Semantic Color & Accessibility Rules**:
  - **60% Neutral Canvas (`#F8FAFC`) / 30% Structural Surfaces (`#FFFFFF`, `#0F172A`, `#475569`) / 10% Civic Cobalt (`#1D4ED8`) & Semantic Severity**.
  - **Severity Signaling**: Never color-only. Pair `Critical` (`#DC2626`), `High` (`#C2410C`), `Medium` (`#B45309`), and `Low` (`#475569`) with explicit text labels and icons.
  - **AI Provenance Clarity**: Every AI output panel explicitly indicates model provenance (`Gemini Pro` + `Laya Typed Decisions` + `Python Rules Engine`, or `Demo Simulation`) and highlights disagreements cleanly for human officers.
  - **Zero-Pill Metadata**: Inline metadata (ward, department, timestamp, coordinate accuracy) uses clean typographic separators (`·`, `/`) rather than capsule pills.
  - **State Completeness**: Skeleton loading states on queue/analytics fetches, clear empty states with reset actions, and explicit error recovery banners.

---

## 5. Backend Scheme (FastAPI + Celery + Supabase PostGIS/pgvector)

### 5.1 Supabase PostgreSQL + PostGIS + pgvector Schema

```sql
-- Extensions required in Supabase: postgis, vector, pgcrypto

-- 1. User Profiles & RBAC
user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('citizen', 'officer', 'admin')),
  department_id uuid REFERENCES departments(id),
  created_at timestamptz DEFAULT now()
)

-- 2. Municipal Departments
departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL, -- 'ROADS', 'WASTE', 'WATER', 'ELECTRICITY', 'TREES', 'DRAINAGE'
  name text NOT NULL,
  sla_hours_critical integer NOT NULL DEFAULT 2,
  sla_hours_high integer NOT NULL DEFAULT 12
)

-- 3. Immutable Citizen Complaints (Never discarded on duplicate merge)
complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_code text UNIQUE NOT NULL, -- e.g. 'CMP-2026-0891'
  citizen_user_id uuid REFERENCES user_profiles(id),
  citizen_name text,
  citizen_contact text,
  title text NOT NULL,
  description text NOT NULL,
  detected_language text,
  image_storage_path text,
  image_public_url text,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  location_accuracy_m double precision,
  location_source text NOT NULL CHECK (location_source IN ('exif', 'browser_gps', 'manual_map')),
  geom geography(Point, 4326) NOT NULL,
  embedding vector(384), -- Multilingual Sentence Transformer vector
  processing_status text NOT NULL CHECK (processing_status IN ('queued', 'processing', 'completed', 'failed')),
  incident_ticket_id uuid REFERENCES tickets(id),
  duplicate_outcome text CHECK (duplicate_outcome IN ('new_complaint', 'likely_duplicate', 'uncertain_match')),
  created_at timestamptz DEFAULT now()
)

-- 4. Operational Incident Tickets (Officer Queue & Lifecycle)
tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_code text UNIQUE NOT NULL, -- e.g. 'CL-2026-0412'
  primary_complaint_id uuid NOT NULL REFERENCES complaints(id),
  summary text NOT NULL,
  category text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  severity_reason text NOT NULL,
  priority_score integer NOT NULL, -- Computed: severity + impact + location_sensitivity + wait_time
  is_critical_escalated boolean NOT NULL DEFAULT false,
  department_id uuid REFERENCES departments(id),
  assigned_officer_id uuid REFERENCES user_profiles(id),
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
  needs_human_review boolean NOT NULL DEFAULT false,
  review_reason text,
  duplicate_count integer NOT NULL DEFAULT 1,
  resolution_notes text,
  resolution_image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  resolved_at timestamptz
)

-- 5. AI & Independent Decision Audit Records
ai_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid NOT NULL REFERENCES complaints(id),
  gemini_raw_json jsonb NOT NULL,
  gemini_category text NOT NULL,
  gemini_severity text NOT NULL,
  gemini_confidence numeric(4,3) NOT NULL,
  laya_decision_json jsonb NOT NULL,
  laya_category text NOT NULL,
  laya_severity text NOT NULL,
  laya_confidence numeric(4,3) NOT NULL,
  rules_triggered text[] NOT NULL DEFAULT '{}',
  has_disagreement boolean NOT NULL DEFAULT false,
  disagreement_summary text,
  is_simulated boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
)

-- 6. Geospatial + Semantic Duplicate Candidates (For Uncertain & Merged Links)
duplicate_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_complaint_id uuid NOT NULL REFERENCES complaints(id),
  candidate_ticket_id uuid NOT NULL REFERENCES tickets(id),
  distance_meters double precision NOT NULL,
  semantic_similarity numeric(4,3) NOT NULL,
  combined_likelihood numeric(4,3) NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('likely_duplicate', 'uncertain_match', 'rejected')),
  reviewed_by uuid REFERENCES user_profiles(id),
  reviewed_at timestamptz
)

-- 7. Immutable Audit Logs & Citizen Notifications
audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES tickets(id),
  complaint_id uuid REFERENCES complaints(id),
  actor_id uuid REFERENCES user_profiles(id),
  actor_role text NOT NULL,
  action_type text NOT NULL, -- 'AI_EVALUATED', 'RULE_ESCALATION', 'HUMAN_OVERRIDE', 'STATUS_CHANGE', 'DUPLICATE_LINKED', 'DUPLICATE_REJECTED'
  previous_state jsonb,
  new_state jsonb,
  note text,
  created_at timestamptz DEFAULT now()
)

notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid REFERENCES complaints(id),
  ticket_id uuid REFERENCES tickets(id),
  recipient_contact text,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
)
```

### 5.2 FastAPI REST API Endpoints & Celery Pipeline

| Endpoint | Role Access | Description |
| :--- | :--- | :--- |
| `POST /api/v1/auth/session` | Public | Authenticate via Supabase Auth or verify role session (`citizen`, `officer`, `admin`) |
| `POST /api/v1/complaints` | Citizen / Any | Multipart upload (title, description, contact, optional image, GPS/manual lat/lng). Extracts EXIF if present, uploads image to Supabase Storage, creates `complaints` row, enqueues Celery triage task, returns `202 Accepted` with `complaint_code` |
| `GET /api/v1/complaints/:complaintCode` | Citizen (owner) / Officer / Admin | Returns live Celery processing stage (`queued/processing/completed`), extracted location, linked `ticket_code`, and citizen notifications |
| `GET /api/v1/tickets` | Officer / Admin | Priority-sorted tickets (`is_critical_escalated DESC, priority_score DESC, created_at DESC`) with filters (`status`, `severity`, `department`, `needs_human_review`, `uncertain_duplicate`, bounding box) |
| `GET /api/v1/tickets/:ticketCode` | Citizen (public safe fields) / Officer / Admin (full) | Full ticket detail, linked citizen complaints (`complaints[]`), `ai_evaluations` (Gemini vs. Laya vs. Rules), `duplicate_matches`, and `audit_logs` |
| `PATCH /api/v1/tickets/:ticketCode/status` | Officer / Admin | Enforces valid lifecycle transition (`OPEN → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED`), requires resolution notes + optional evidence image when resolving, writes `audit_logs` & `notifications` |
| `PATCH /api/v1/tickets/:ticketCode/override` | Officer / Admin | Human override of severity, category, or department with mandatory override reason logged to `audit_logs` |
| `POST /api/v1/duplicates/:matchId/resolve` | Officer / Admin | Resolves an `uncertain_match`: `confirm_merge` (links complaint to candidate ticket & increments count) or `keep_separate` (promotes complaint to standalone ticket) |
| `GET /api/v1/analytics/overview` | Officer / Admin | Aggregated counts, dept distribution, avg resolution time, critical/high stats, PostGIS hotspot GeoJSON clusters, recurring incident counts, duplicate merge rate, and SLA performance |
| `GET /api/v1/health` | Public | Reports availability of FastAPI, Celery/Redis, Supabase, Gemini Pro, Laya Typed Decisions, and Sentence Transformers |

---

## 6. Frontend Implementation Plan (Modular React + TypeScript)

```
┌───────────────────────────────────────────────────────────────────────────┐
│                         MODULAR FRONTEND LAYERS                           │
├───────────────────────────────────────────────────────────────────────────┤
│ 1. Auth & Provenance Context                                              │
│    • Role session state ('citizen' | 'officer' | 'admin')                 │
│    • Backend health probe -> Live API vs. Clearly Labelled Demo Adapter   │
├───────────────────────────────────────────────────────────────────────────┤
│ 2. Typed Service & Geospatial Utilities                                   │
│    • REST API Client (FastAPI endpoints) + Supabase Realtime Hook         │
│    • Client-Side EXIF GPS Extractor (reads JPEG EXIF lat/lng preview)     │
│    • Browser Geolocation Helper (lat, lng, accuracy_m)                    │
│    • Deterministic Demo Pipeline Engine (labelled 'SIMULATED DEMO' only)  │
├───────────────────────────────────────────────────────────────────────────┤
│ 3. Shared Interactive Mapping Module (Leaflet)                            │
│    • LocationPickerMap (Citizen pin drop, GPS center, EXIF jump)          │
│    • OfficerOperationsMap (Severity pins, radius rings, click-to-inspect) │
│    • HotspotAnalyticsMap (Geographic density & recurring clusters)        │
├───────────────────────────────────────────────────────────────────────────┤
│ 4. Role-Specific Workspace Views                                          │
│    • CitizenIntakeView (Multilingual form, EXIF/GPS/Map, Live Triage)     │
│    • CitizenTrackerView (Ticket/Complaint lookup, 5-stage timeline, alerts│
│    • OfficerDashboardView (KPIs, Priority Queue, Map Split, Dup Review)   │
│    • TicketInspectionDrawer (Evidence, AI vs Laya Diff, Override, Status) │
│    • AnalyticsMonitoringView (Dept SLAs, Resolution Time, Hotspots, Audit)│
└───────────────────────────────────────────────────────────────────────────┘
```

### Key Frontend Implementation Standards
1. **Strict Provenance & No Fabricated AI**: Every AI classification card displays whether the payload came from the live FastAPI Gemini Pro + Laya pipeline or the local Demo Simulation adapter (`is_simulated` boolean badge).
2. **EXIF + GPS + Manual Map Integration**: When a citizen uploads a JPEG photo, a lightweight client-side EXIF parser extracts embedded GPS coordinates (if present) immediately so the user sees `"GPS detected from photo EXIF"` on the interactive map before even submitting; otherwise it uses browser GPS or lets them click anywhere on the map.
3. **Priority & Escalation Sorting**: Officer queue always surfaces `is_critical_escalated` and `critical` tickets first, followed by descending `priority_score` (combining severity, impact, sensitivity, waiting time).
4. **Full 5-Stage Lifecycle Enforcement**: The Officer Inspection Drawer only enables valid next lifecycle transitions (`OPEN → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED`) and opens a dedicated resolution input (description + optional evidence image upload) before allowing `RESOLVED`.
5. **Uncertain Duplicate Workbench**: Officers have a dedicated `"Needs Review"` filter showing both Gemini/Laya disagreements and `uncertain_match` duplicate candidates with side-by-side comparison (`Distance in meters`, `Semantic similarity %`, `Shared category`) and one-click `"Confirm Duplicate Link"` or `"Create Separate Ticket"`.

---

## 7. Incremental Phase-by-Phase Build Plan

We will build the frontend incrementally, prioritizing a working end-to-end complaint lifecycle before expanding into advanced analytics and polish:

- **Phase 1 — Architecture, Types, Theme & Service Contracts**
  - Configure `Plus Jakarta Sans`, `Public Sans`, `JetBrains Mono`, Tailwind CSS tokens, and Leaflet stylesheet.
  - Define strict TypeScript domain models matching the FastAPI/Supabase schema (`Complaint`, `Ticket`, `AIEvaluation`, `DuplicateMatch`, `AuditLogEntry`, `AnalyticsSummary`, `PipelineStage`).
  - Build the typed `CivicLensApiClient` interface with environment-configured FastAPI base URL, `/api/health` check, and a clearly labeled `DemoPipelineAdapter` fallback (with realistic multilingual sample incidents).

- **Phase 2 — Working End-to-End Core Lifecycle (`Submit → Triage → Officer Action → Track`)**
  - Build the client EXIF GPS extractor + Browser Geolocation hook + interactive Leaflet `LocationPickerMap`.
  - Build `CitizenIntakeView` (title, multilingual description, contact, photo upload, location picker, progressive async pipeline tracker).
  - Build `OfficerDashboardView` (priority-sorted queue + KPI overview) and `TicketInspectionDrawer` with `OPEN → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED` transitions + resolution notes/photo.
  - Build `CitizenTrackerView` showing real-time lifecycle progress, notifications, and resolution evidence.

- **Phase 3 — AI Decision Comparison, Duplicate Verification & Officer Map**
  - Add the side-by-side **Gemini Pro vs. Laya Typed Decisions + Python Rules Engine** inspection panel inside the ticket drawer (highlighting disagreements, confidence scores, and human override controls with mandatory audit reason).
  - Add the **Duplicate Identification & Verification** panel handling all 3 outcomes (`likely_duplicate` linked incidents list, `new_complaint`, and `uncertain_match` manual merge/split buttons).
  - Integrate `OfficerOperationsMap` (interactive Leaflet map synchronized with table selection and PostGIS duplicate radius circle visualization).

- **Phase 4 — Analytics & Monitoring, RBAC Polish & Audit Logs**
  - Build `AnalyticsMonitoringView` covering total/pending/resolved counts, department distribution, average resolution time, critical/high hazard tracking, recurring incidents, duplicate stats, department SLA performance, and interactive hotspot map.
  - Add full ticket & system **Audit Log** timeline drawer/tab and clean RBAC role gating (`Citizen`, `Officer`, `Admin`) + Auth/Demo Role switcher.

- **Phase 5 — Live Backend Integration Verification & Build QA**
  - Test against FastAPI endpoints + Supabase Realtime/Storage (or verify seamless switching between Live API and Demo mode).
  - Run `tsc --noEmit` (`npm run lint`) and `vite build` (`npm run build`), verify responsive desktop/mobile layouts, and validate zero console errors across the full 11-stage workflow.
