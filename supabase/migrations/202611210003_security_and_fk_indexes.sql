-- CivicLens security hardening and foreign-key indexes.
-- Apply after 202611210002_harden_storage_and_history.sql.

create index if not exists complaint_links_incident_id_idx
  on complaint_links (incident_id);
create index if not exists complaints_ticket_id_idx
  on complaints (ticket_id);
create index if not exists decision_audits_ticket_id_idx
  on decision_audits (ticket_id);
create index if not exists tickets_incident_id_idx
  on tickets (incident_id);

alter function set_updated_at() set search_path = public, pg_temp;
alter function set_geographic_point() set search_path = public, pg_temp;
alter function find_duplicate_candidates(vector, double precision, double precision, text, uuid, double precision)
  set search_path = public, pg_temp;
alter function record_ticket_status_change() set search_path = public, pg_temp;
alter function set_ticket_resolved_at() set search_path = public, pg_temp;