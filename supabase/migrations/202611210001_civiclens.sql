create extension if not exists postgis;
create extension if not exists vector;
create extension if not exists pgcrypto;

create type complaint_status as enum (
  'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED'
);

create type ticket_status as enum (
  'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'
);

create type duplicate_decision as enum (
  'NEW_COMPLAINT', 'LIKELY_DUPLICATE', 'UNCERTAIN_MATCH'
);

create table complaints (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  citizen_name text,
  citizen_contact text,
  latitude double precision,
  longitude double precision,
  location_accuracy_m double precision,
  location_source text not null default 'MANUAL',
  geographic_point geography(point, 4326),
  photo_url text,
  ai_category text,
  ai_severity text,
  ai_summary text,
  ai_confidence double precision,
  original_language text,
  embedding vector(384),
  incident_id uuid,
  ticket_id uuid,
  duplicate_decision duplicate_decision,
  processing_status complaint_status not null default 'QUEUED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table incidents (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  severity text not null,
  summary text,
  latitude double precision,
  longitude double precision,
  geographic_point geography(point, 4326),
  status text not null default 'OPEN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table tickets (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid references incidents(id),
  category text not null,
  severity text not null,
  department text not null,
  priority integer not null check (priority between 0 and 100),
  status ticket_status not null default 'OPEN',
  assigned_department text,
  assigned_officer text,
  human_review_required boolean not null default false,
  resolution_notes text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table complaints
  add constraint complaints_incident_fk
  foreign key (incident_id) references incidents(id);
alter table complaints
  add constraint complaints_ticket_fk
  foreign key (ticket_id) references tickets(id);

create table complaint_links (
  complaint_id uuid references complaints(id) on delete cascade,
  incident_id uuid references incidents(id) on delete cascade,
  confidence double precision not null,
  linked_at timestamptz not null default now(),
  primary key (complaint_id, incident_id)
);

create table decision_audits (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid references complaints(id) on delete cascade,
  ticket_id uuid references tickets(id),
  ai_output jsonb not null,
  rules_output jsonb not null,
  duplicate_decision text,
  model_versions jsonb not null,
  created_at timestamptz not null default now()
);

create table ticket_history (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references tickets(id) on delete cascade,
  previous_status ticket_status,
  new_status ticket_status not null,
  changed_by text,
  notes text,
  created_at timestamptz not null default now()
);

create index complaints_location_idx
  on complaints using gist (geographic_point);
create index incidents_location_idx
  on incidents using gist (geographic_point);
create index complaints_embedding_idx
  on complaints using hnsw (embedding vector_cosine_ops);
create index tickets_priority_idx on tickets (priority desc);

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger complaints_updated_at before update on complaints
for each row execute function set_updated_at();
create trigger incidents_updated_at before update on incidents
for each row execute function set_updated_at();
create trigger tickets_updated_at before update on tickets
for each row execute function set_updated_at();

create or replace function set_geographic_point()
returns trigger language plpgsql as $$
begin
  if new.latitude is not null and new.longitude is not null then
    new.geographic_point = st_point(new.longitude, new.latitude)::geography;
  end if;
  return new;
end;
$$;

create trigger complaints_geographic_point before insert or update on complaints
for each row execute function set_geographic_point();
create trigger incidents_geographic_point before insert or update on incidents
for each row execute function set_geographic_point();

create or replace function find_duplicate_candidates(
  query_embedding vector(384),
  query_latitude double precision,
  query_longitude double precision,
  query_category text,
  exclude_complaint_id uuid,
  distance_meters double precision default 1500
)
returns table (
  incident_id uuid,
  complaint_id uuid,
  duplicate_score double precision
) language sql stable as $$
  select
    c.incident_id,
    c.id,
    (
      (1 - (c.embedding <=> query_embedding)) * 0.55
      + case
          when c.ai_category = query_category then 0.20
          else 0.05
        end
      + case
          when c.geographic_point is not null
            and st_dwithin(
              c.geographic_point,
              st_point(query_longitude, query_latitude)::geography,
              distance_meters
            ) then 0.25
          else 0
        end
    ) as score
  from complaints c
  where c.id <> exclude_complaint_id
    and c.incident_id is not null
    and c.embedding is not null
  order by
    c.embedding <=> query_embedding,
    st_dwithin(
      c.geographic_point,
      st_point(query_longitude, query_latitude)::geography,
      distance_meters
    ) desc
  limit 20;
$$;
