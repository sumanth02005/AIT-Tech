export type UserRole = 'citizen' | 'officer' | 'admin';

export type ComplaintCategory =
  | 'roads'
  | 'waste'
  | 'water'
  | 'electricity'
  | 'trees'
  | 'drainage';

export type TicketSeverity = 'critical' | 'high' | 'medium' | 'low';

export type TicketStatus =
  | 'OPEN'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'CLOSED';

export type LocationSource = 'exif' | 'browser_gps' | 'manual_map';

export type DuplicateOutcome =
  | 'new_complaint'
  | 'likely_duplicate'
  | 'uncertain_match';

export type PipelineStage =
  | 'submitted'
  | 'location_extracted'
  | 'ai_classified'
  | 'decision_evaluated'
  | 'embedding_generated'
  | 'duplicate_checked'
  | 'ticket_routed';

export interface UserSession {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  department_code?: string;
  auth_mode: 'demo_role' | 'jwt_session';
}

export interface Department {
  code: string;
  name: string;
  category: ComplaintCategory;
  sla_hours_critical: number;
  sla_hours_high: number;
}

export interface GeoLocationData {
  latitude: number;
  longitude: number;
  accuracy_m: number;
  source: LocationSource;
  address_label?: string;
}

export interface AIEvaluation {
  id: string;
  complaint_id: string;
  gemini_category: ComplaintCategory;
  gemini_severity: TicketSeverity;
  gemini_confidence: number;
  gemini_hazards: string[];
  gemini_summary: string;
  gemini_recommended_department: string;
  detected_language: string;
  laya_category: ComplaintCategory;
  laya_severity: TicketSeverity;
  laya_confidence: number;
  laya_rationale: string;
  rules_triggered: string[];
  has_disagreement: boolean;
  disagreement_summary?: string;
  embedding_model: string;
  embedding_dimensions: number;
  is_simulated: boolean;
  created_at: string;
}

export interface ComplaintRecord {
  id: string;
  complaint_code: string;
  citizen_name: string;
  citizen_contact: string;
  title: string;
  description: string;
  language_hint?: string;
  detected_language: string;
  image_url?: string;
  latitude: number;
  longitude: number;
  location_accuracy_m: number;
  location_source: LocationSource;
  location_label: string;
  processing_status: 'queued' | 'processing' | 'completed' | 'failed';
  pipeline_stage: PipelineStage;
  duplicate_outcome: DuplicateOutcome;
  incident_ticket_code: string;
  created_at: string;
}

export interface DuplicateMatch {
  id: string;
  source_complaint_code: string;
  source_title: string;
  source_description: string;
  source_created_at: string;
  candidate_ticket_code: string;
  distance_meters: number;
  semantic_similarity: number;
  combined_likelihood: number;
  outcome: 'likely_duplicate' | 'uncertain_match' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
}

export interface AuditLogEntry {
  id: string;
  ticket_code: string;
  complaint_code?: string;
  actor_name: string;
  actor_role: UserRole | 'system';
  action_type:
    | 'COMPLAINT_SUBMITTED'
    | 'AI_EVALUATED'
    | 'RULE_ESCALATION'
    | 'HUMAN_OVERRIDE'
    | 'STATUS_CHANGE'
    | 'DEPARTMENT_ASSIGNED'
    | 'DUPLICATE_LINKED'
    | 'DUPLICATE_REJECTED';
  summary: string;
  previous_value?: string;
  new_value?: string;
  note?: string;
  created_at: string;
}

export interface CitizenNotification {
  id: string;
  complaint_code: string;
  ticket_code: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface Ticket {
  id: string;
  ticket_code: string;
  primary_complaint_code: string;
  summary: string;
  category: ComplaintCategory;
  severity: TicketSeverity;
  severity_reason: string;
  priority_score: number;
  is_critical_escalated: boolean;
  department_code: string;
  department_name: string;
  assigned_officer?: string;
  status: TicketStatus;
  needs_human_review: boolean;
  review_reason?: string;
  duplicate_count: number;
  location_label: string;
  latitude: number;
  longitude: number;
  location_accuracy_m: number;
  location_source: LocationSource;
  resolution_notes?: string;
  resolution_image_url?: string;
  is_simulated: boolean;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  linked_complaints: ComplaintRecord[];
  ai_evaluation: AIEvaluation;
  duplicate_matches: DuplicateMatch[];
  audit_logs: AuditLogEntry[];
}

export interface BackendHealth {
  mode: 'live' | 'demo';
  backend_reachable: boolean;
  fastapi_status: 'connected' | 'unreachable';
  services: {
    supabase_postgis: boolean;
    pgvector: boolean;
    celery_redis: boolean;
    gemini_pro: boolean;
    laya_decisions: boolean;
    sentence_transformers: boolean;
  };
  checked_at: string;
}

export interface CreateComplaintPayload {
  title: string;
  description: string;
  language_hint: string;
  citizen_name: string;
  citizen_contact: string;
  location: GeoLocationData;
  image_file?: File | null;
  image_preview_url?: string;
}

export interface CreateComplaintResponse {
  complaint: ComplaintRecord;
  ticket: Ticket;
  duplicate_outcome: DuplicateOutcome;
  is_simulated: boolean;
}

export interface BackendComplaintResponse {
  id: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  incident_id?: string | null;
  ticket_id?: string | null;
  location_source: string;
}

export interface BackendTicket {
  id: string;
  incident_id?: string | null;
  category: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  department: string;
  priority: number;
  status: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  assigned_department?: string | null;
  assigned_officer?: string | null;
  human_review_required?: boolean;
  resolution_notes?: string | null;
  resolved_at?: string | null;
  created_at: string;
  updated_at: string;
  incidents?: {
    id: string;
    status?: string;
    summary?: string | null;
    category?: string;
    latitude?: number | null;
    longitude?: number | null;
    created_at?: string;
    updated_at?: string;
  } | null;
}

export interface DepartmentAnalytics {
  department_code: string;
  department_name: string;
  total: number;
  open_or_assigned: number;
  in_progress: number;
  resolved_or_closed: number;
  avg_resolution_hours: number;
  sla_compliance_pct: number;
}

export interface HotspotCluster {
  id: string;
  area_name: string;
  latitude: number;
  longitude: number;
  incident_count: number;
  critical_or_high_count: number;
  dominant_category: ComplaintCategory;
  recurring_issue_label: string;
}

export interface AnalyticsOverview {
  total_complaints_received: number;
  total_unique_tickets: number;
  pending_tickets: number;
  in_progress_tickets: number;
  resolved_or_closed_tickets: number;
  critical_and_high_count: number;
  avg_resolution_hours: number;
  duplicate_complaints_linked: number;
  duplicate_rate_pct: number;
  human_review_flagged_count: number;
  department_breakdown: DepartmentAnalytics[];
  hotspots: HotspotCluster[];
}
