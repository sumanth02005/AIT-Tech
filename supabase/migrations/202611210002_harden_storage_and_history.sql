-- CivicLens hardening and Supabase Storage setup.
-- Apply after 202611210001_civiclens.sql.

alter table complaints
  add column if not exists photo_path text;

alter table complaints
  add constraint complaints_latitude_range
  check (latitude is null or latitude between -90 and 90);

alter table complaints
  add constraint complaints_longitude_range
  check (longitude is null or longitude between -180 and 180);

alter table incidents
  add constraint incidents_latitude_range
  check (latitude is null or latitude between -90 and 90);

alter table incidents
  add constraint incidents_longitude_range
  check (longitude is null or longitude between -180 and 180);

create index if not exists complaints_processing_status_idx
  on complaints (processing_status, created_at desc);
create index if not exists complaints_incident_id_idx
  on complaints (incident_id);
create index if not exists tickets_status_idx
  on tickets (status, created_at desc);
create index if not exists decision_audits_complaint_id_idx
  on decision_audits (complaint_id, created_at desc);
create index if not exists ticket_history_ticket_id_idx
  on ticket_history (ticket_id, created_at desc);

-- The API uses the service-role key, which bypasses RLS. Enabling RLS prevents
-- accidental exposure if a public or authenticated client is introduced later.
alter table complaints enable row level security;
alter table incidents enable row level security;
alter table tickets enable row level security;
alter table complaint_links enable row level security;
alter table decision_audits enable row level security;
alter table ticket_history enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'complaint-evidence',
  'complaint-evidence',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Backend requests use service_role and bypass these policies. These explicit
-- policies document the intended boundary for future authenticated clients.
drop policy if exists "Authenticated users can read complaint evidence" on storage.objects;
create policy "Authenticated users can read complaint evidence"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'complaint-evidence');

drop policy if exists "Authenticated users can upload complaint evidence" on storage.objects;
create policy "Authenticated users can upload complaint evidence"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'complaint-evidence');

create or replace function record_ticket_status_change()
returns trigger language plpgsql as $$
begin
  if old.status is distinct from new.status then
    insert into ticket_history (
      ticket_id,
      previous_status,
      new_status,
      changed_by,
      notes
    ) values (
      new.id,
      old.status,
      new.status,
      'database-trigger',
      case when new.status = 'RESOLVED' then new.resolution_notes else null end
    );
  end if;
  return new;
end;
$$;

drop trigger if exists tickets_status_history on tickets;
create trigger tickets_status_history
  after update of status on tickets
  for each row execute function record_ticket_status_change();

create or replace function set_ticket_resolved_at()
returns trigger language plpgsql as $$
begin
  if new.status in ('RESOLVED', 'CLOSED') and old.status not in ('RESOLVED', 'CLOSED') then
    new.resolved_at = coalesce(new.resolved_at, now());
  elsif new.status not in ('RESOLVED', 'CLOSED') then
    new.resolved_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists tickets_resolved_at on tickets;
create trigger tickets_resolved_at
  before update of status on tickets
  for each row execute function set_ticket_resolved_at();