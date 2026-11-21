import {
  CATEGORY_LABELS,
  DEPARTMENTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_TICKETS,
  SEVERITY_RANK,
} from '../data/seedData';
import {
  AIEvaluation,
  AnalyticsOverview,
  AuditLogEntry,
  BackendHealth,
  CitizenNotification,
  ComplaintCategory,
  ComplaintRecord,
  CreateComplaintPayload,
  CreateComplaintResponse,
  DuplicateMatch,
  DuplicateOutcome,
  Ticket,
  TicketSeverity,
  TicketStatus,
  UserRole,
} from '../types/civiclens';
import { haversineMeters } from '../utils/geo';

const STORAGE_KEY_TICKETS = 'civiclens_demo_tickets_v1';
const STORAGE_KEY_NOTIFS = 'civiclens_demo_notifs_v1';
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

function readStoredTickets(): Ticket[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TICKETS);
    if (!raw) return structuredClone(INITIAL_TICKETS);
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed
      : structuredClone(INITIAL_TICKETS);
  } catch {
    return structuredClone(INITIAL_TICKETS);
  }
}

function writeStoredTickets(tickets: Ticket[]) {
  try {
    localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(tickets));
  } catch {
    // Ignore quota errors in sandboxed iframes
  }
}

function readStoredNotifications(): CitizenNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NOTIFS);
    if (!raw) return structuredClone(INITIAL_NOTIFICATIONS);
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : structuredClone(INITIAL_NOTIFICATIONS);
  } catch {
    return structuredClone(INITIAL_NOTIFICATIONS);
  }
}

function writeStoredNotifications(notifs: CitizenNotification[]) {
  try {
    localStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify(notifs));
  } catch {
    // Ignore storage errors
  }
}

export function sortTicketsByPriority(tickets: Ticket[]): Ticket[] {
  return [...tickets].sort((a, b) => {
    const aClosed = a.status === 'CLOSED' || a.status === 'RESOLVED' ? 1 : 0;
    const bClosed = b.status === 'CLOSED' || b.status === 'RESOLVED' ? 1 : 0;
    if (aClosed !== bClosed) return aClosed - bClosed;

    if (a.is_critical_escalated !== b.is_critical_escalated) {
      return a.is_critical_escalated ? -1 : 1;
    }

    const sevDiff = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    if (sevDiff !== 0) return sevDiff;

    if (b.priority_score !== a.priority_score) {
      return b.priority_score - a.priority_score;
    }

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

function classifyTextSimulated(
  title: string,
  description: string,
  languageHint: string
): {
  category: ComplaintCategory;
  geminiSeverity: TicketSeverity;
  layaSeverity: TicketSeverity;
  geminiConfidence: number;
  layaConfidence: number;
  hazards: string[];
  rulesTriggered: string[];
  hasDisagreement: boolean;
  disagreementSummary?: string;
  detectedLanguage: string;
  summary: string;
  severityReason: string;
  layaRationale: string;
} {
  const combined = `${title} ${description}`.toLowerCase();

  let category: ComplaintCategory = 'roads';
  if (/wire|electric|pole|transformer|spark|streetlight|बिजली|तार|खंभा|current|shock/.test(combined)) {
    category = 'electricity';
  } else if (/garbage|trash|waste|dumpster|bin|smell|कचरा|कुड़ा|सफाई/.test(combined)) {
    category = 'waste';
  } else if (/water|pipe|leak|main|drinking|tap|पानी|पाइप/.test(combined)) {
    category = 'water';
  } else if (/drain|sewer|culvert|flood|stagnant|नाला|जलभराव/.test(combined)) {
    category = 'drainage';
  } else if (/tree|branch|fallen|limb|पेड़/.test(combined)) {
    category = 'trees';
  }

  const hasSchoolOrHospital = /school|hospital|clinic|स्कूल|अस्पताल|children|बच्चों/.test(combined);
  const hasLiveElectrical = /wire|live|spark|exposed|तार|खुला|shock|करंट/.test(combined);
  const hasMajorFloodOrBurst = /burst|gushing|crater|deep|overflowing|accident|skid/.test(combined);

  let geminiSeverity: TicketSeverity = 'medium';
  let layaSeverity: TicketSeverity = 'medium';
  let geminiConfidence = 0.88;
  let layaConfidence = 0.87;
  const rulesTriggered: string[] = [];
  const hazards: string[] = [];

  if (category === 'electricity' && hasLiveElectrical) {
    geminiSeverity = 'critical';
    layaSeverity = 'critical';
    geminiConfidence = 0.95;
    layaConfidence = 0.94;
    hazards.push('Exposed electrical conductor', 'Electrocution hazard');
    rulesTriggered.push('RULE_EXPOSED_CONDUCTOR_DISPATCH');
    if (hasSchoolOrHospital) {
      hazards.push('Vulnerable pedestrian zone');
      rulesTriggered.push('RULE_SCHOOL_ZONE_CRITICAL_ESCALATION');
    }
  } else if (hasMajorFloodOrBurst) {
    geminiSeverity = 'high';
    layaSeverity = 'high';
    geminiConfidence = 0.9;
    layaConfidence = 0.88;
    hazards.push('Public mobility & safety disruption');
    if (category === 'roads') rulesTriggered.push('RULE_ARTERIAL_ROAD_PRIORITY_BOOST');
    if (category === 'water') rulesTriggered.push('RULE_WATER_MAIN_VALVE_PRIORITY');
  } else if (category === 'waste' && hasSchoolOrHospital) {
    geminiSeverity = 'medium';
    layaSeverity = 'high';
    geminiConfidence = 0.77;
    layaConfidence = 0.88;
    hazards.push('Sanitation spill near medical facility');
    rulesTriggered.push('RULE_CLINIC_BUFFER_ESCALATION', 'RULE_MODEL_DISAGREEMENT_REVIEW');
  } else {
    geminiSeverity = 'medium';
    layaSeverity = 'medium';
    hazards.push(`Localized ${CATEGORY_LABELS[category].toLowerCase()} disruption`);
  }

  const hasDisagreement = geminiSeverity !== layaSeverity || geminiConfidence < 0.8;
  const detectedLanguage =
    /[\u0900-\u097F]/.test(combined) || languageHint === 'hi'
      ? 'Hindi (hi)'
      : /[\u0B80-\u0BFF]/.test(combined) || languageHint === 'ta'
      ? 'Tamil (ta)'
      : /[\u0C00-\u0C7F]/.test(combined) || languageHint === 'te'
      ? 'Telugu (te)'
      : 'English (en)';

  const summary =
    detectedLanguage.startsWith('English')
      ? title.trim()
      : `[Translated from ${detectedLanguage.split(' ')[0]}] ${
          category === 'electricity'
            ? 'Exposed electrical hazard reported near public footpath/school zone'
            : `Municipal ${CATEGORY_LABELS[category].toLowerCase()} issue reported in local language`
        }`;

  return {
    category,
    geminiSeverity,
    layaSeverity,
    geminiConfidence,
    layaConfidence,
    hazards,
    rulesTriggered,
    hasDisagreement,
    disagreementSummary: hasDisagreement
      ? `Severity variance: Gemini=${geminiSeverity} (${geminiConfidence.toFixed(2)}) vs Laya=${layaSeverity} (${layaConfidence.toFixed(2)}).`
      : undefined,
    detectedLanguage,
    summary,
    severityReason:
      layaSeverity === 'critical'
        ? 'Immediate life-safety hazard flagged by multimodal check and safety rule escalation.'
        : layaSeverity === 'high'
        ? 'Elevated public impact or proximity to sensitive civic infrastructure.'
        : 'Standard municipal service disruption queued by SLA priority.',
    layaRationale:
      rulesTriggered.length > 0
        ? `Evaluated against civic safety policy (${rulesTriggered.join(', ')}).`
        : 'Typed decision rubric aligns with Gemini Pro extraction.',
  };
}

function tokenOverlapSimilarity(a: string, b: string): number {
  const tokenize = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^a-z0-9\u0900-\u097F\u0B80-\u0BFF\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2)
    );
  const setA = tokenize(a);
  const setB = tokenize(b);
  if (setA.size === 0 || setB.size === 0) return 0.35;
  let overlap = 0;
  setA.forEach((w) => {
    if (setB.has(w)) overlap += 1;
  });
  return Number(Math.min(0.95, (overlap * 2) / (setA.size + setB.size) + 0.25).toFixed(2));
}

export class CivicLensApiClient {
  async checkHealth(preferredMode: 'auto' | 'demo' = 'auto'): Promise<BackendHealth> {
    if (preferredMode === 'demo') {
      return {
        mode: 'demo',
        backend_reachable: false,
        fastapi_status: 'unreachable',
        services: {
          supabase_postgis: false,
          pgvector: false,
          celery_redis: false,
          gemini_pro: false,
          laya_decisions: false,
          sentence_transformers: false,
        },
        checked_at: new Date().toISOString(),
      };
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1800);
      const res = await fetch(`${API_BASE}/api/v1/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        return {
          mode: 'live',
          backend_reachable: true,
          fastapi_status: 'connected',
          services: {
            supabase_postgis: Boolean(data.services?.supabase_postgis ?? true),
            pgvector: Boolean(data.services?.pgvector ?? true),
            celery_redis: Boolean(data.services?.celery_redis ?? true),
            gemini_pro: Boolean(data.services?.gemini_pro ?? true),
            laya_decisions: Boolean(data.services?.laya_decisions ?? true),
            sentence_transformers: Boolean(data.services?.sentence_transformers ?? true),
          },
          checked_at: new Date().toISOString(),
        };
      }
    } catch {
      // Backend not mounted in current preview; transparently use demo mode
    }

    return {
      mode: 'demo',
      backend_reachable: false,
      fastapi_status: 'unreachable',
      services: {
        supabase_postgis: false,
        pgvector: false,
        celery_redis: false,
        gemini_pro: false,
        laya_decisions: false,
        sentence_transformers: false,
      },
      checked_at: new Date().toISOString(),
    };
  }

  async fetchTickets(mode: 'live' | 'demo'): Promise<Ticket[]> {
    if (mode === 'live') {
      const res = await fetch(`${API_BASE}/api/v1/tickets`);
      if (!res.ok) throw new Error(`FastAPI error (${res.status}) loading tickets`);
      const data = await res.json();
      return sortTicketsByPriority(data.tickets ?? data);
    }
    return sortTicketsByPriority(readStoredTickets());
  }

  async fetchNotifications(mode: 'live' | 'demo'): Promise<CitizenNotification[]> {
    if (mode === 'live') {
      const res = await fetch(`${API_BASE}/api/v1/notifications`);
      if (res.ok) {
        const data = await res.json();
        return data.notifications ?? data;
      }
    }
    return readStoredNotifications();
  }

  async submitComplaint(
    payload: CreateComplaintPayload,
    mode: 'live' | 'demo',
    onStageChange?: (stage: ComplaintRecord['pipeline_stage']) => void
  ): Promise<CreateComplaintResponse> {
    if (mode === 'live') {
      onStageChange?.('submitted');
      const formData = new FormData();
      formData.append('title', payload.title);
      formData.append('description', payload.description);
      formData.append('language_hint', payload.language_hint);
      formData.append('citizen_name', payload.citizen_name);
      formData.append('citizen_contact', payload.citizen_contact);
      formData.append('latitude', String(payload.location.latitude));
      formData.append('longitude', String(payload.location.longitude));
      formData.append('location_accuracy_m', String(payload.location.accuracy_m));
      formData.append('location_source', payload.location.source);
      formData.append('location_label', payload.location.address_label || 'Selected Pin');
      if (payload.image_file) {
        formData.append('image', payload.image_file);
      }

      const res = await fetch(`${API_BASE}/api/v1/complaints`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(errBody || `Failed to submit complaint (${res.status})`);
      }
      onStageChange?.('ticket_routed');
      return await res.json();
    }

    // Clearly labeled client-side simulation of the 7-stage backend pipeline
    const stages: ComplaintRecord['pipeline_stage'][] = [
      'submitted',
      'location_extracted',
      'ai_classified',
      'decision_evaluated',
      'embedding_generated',
      'duplicate_checked',
      'ticket_routed',
    ];
    for (const st of stages) {
      onStageChange?.(st);
      await new Promise((r) => setTimeout(r, 220));
    }

    const tickets = readStoredTickets();
    const notifs = readStoredNotifications();
    const nowIso = new Date().toISOString();
    const randomSuffix = Math.floor(1000 + Math.random() * 8999);
    const complaintCode = `CMP-2026-${randomSuffix}`;

    const ai = classifyTextSimulated(
      payload.title,
      payload.description,
      payload.language_hint
    );

    const dept =
      DEPARTMENTS.find((d) => d.category === ai.category) || DEPARTMENTS[0];

    // Check geospatial + semantic duplicate against open/assigned/in_progress tickets
    let matchedTicket: Ticket | null = null;
    let bestDistance = Infinity;
    let bestSim = 0;
    let bestLikelihood = 0;

    for (const t of tickets) {
      if (t.status === 'CLOSED' || t.category !== ai.category) continue;
      const dist = haversineMeters(
        payload.location.latitude,
        payload.location.longitude,
        t.latitude,
        t.longitude
      );
      if (dist <= 300) {
        const sim = tokenOverlapSimilarity(
          `${payload.title} ${payload.description}`,
          `${t.summary} ${t.linked_complaints.map((c) => c.title).join(' ')}`
        );
        const geoFactor = Math.max(0, 1 - dist / 300);
        const likelihood = Number((0.55 * sim + 0.45 * geoFactor).toFixed(2));
        if (likelihood > bestLikelihood) {
          bestLikelihood = likelihood;
          bestDistance = dist;
          bestSim = sim;
          matchedTicket = t;
        }
      }
    }

    let duplicateOutcome: DuplicateOutcome = 'new_complaint';
    if (matchedTicket && bestLikelihood >= 0.78) {
      duplicateOutcome = 'likely_duplicate';
    } else if (matchedTicket && bestLikelihood >= 0.52) {
      duplicateOutcome = 'uncertain_match';
    }

    const newComplaint: ComplaintRecord = {
      id: `cmp-${Date.now()}`,
      complaint_code: complaintCode,
      citizen_name: payload.citizen_name.trim() || 'Citizen Reporter',
      citizen_contact: payload.citizen_contact.trim() || 'Not provided',
      title: payload.title.trim(),
      description: payload.description.trim(),
      language_hint: payload.language_hint,
      detected_language: ai.detectedLanguage,
      image_url: payload.image_preview_url,
      latitude: payload.location.latitude,
      longitude: payload.location.longitude,
      location_accuracy_m: payload.location.accuracy_m,
      location_source: payload.location.source,
      location_label:
        payload.location.address_label ||
        `${payload.location.latitude.toFixed(4)}, ${payload.location.longitude.toFixed(4)}`,
      processing_status: 'completed',
      pipeline_stage: 'ticket_routed',
      duplicate_outcome: duplicateOutcome,
      incident_ticket_code: '',
      created_at: nowIso,
    };

    if (duplicateOutcome === 'likely_duplicate' && matchedTicket) {
      newComplaint.incident_ticket_code = matchedTicket.ticket_code;
      matchedTicket.linked_complaints.push(newComplaint);
      matchedTicket.duplicate_count = matchedTicket.linked_complaints.length;
      matchedTicket.priority_score = Math.min(100, matchedTicket.priority_score + 4);
      matchedTicket.updated_at = nowIso;
      matchedTicket.duplicate_matches.push({
        id: `dup-${Date.now()}`,
        source_complaint_code: complaintCode,
        source_title: newComplaint.title,
        source_description: newComplaint.description,
        source_created_at: nowIso,
        candidate_ticket_code: matchedTicket.ticket_code,
        distance_meters: bestDistance,
        semantic_similarity: bestSim,
        combined_likelihood: bestLikelihood,
        outcome: 'likely_duplicate',
        reviewed_by: 'Simulated PostGIS + pgvector Auto-Link',
        reviewed_at: nowIso,
      });
      matchedTicket.audit_logs.unshift({
        id: `aud-${Date.now()}`,
        ticket_code: matchedTicket.ticket_code,
        complaint_code: complaintCode,
        actor_name: 'Simulated Deduplication Pipeline',
        actor_role: 'system',
        action_type: 'DUPLICATE_LINKED',
        summary: `Linked ${complaintCode} (${bestDistance}m · ${Math.round(
          bestSim * 100
        )}% semantic similarity). Citizen report preserved.`,
        created_at: nowIso,
      });

      notifs.unshift({
        id: `notif-${Date.now()}`,
        complaint_code: complaintCode,
        ticket_code: matchedTicket.ticket_code,
        message: `Your complaint ${complaintCode} was linked to active incident ${matchedTicket.ticket_code} (${bestDistance}m away). Priority score boosted.`,
        is_read: false,
        created_at: nowIso,
      });

      writeStoredTickets(tickets);
      writeStoredNotifications(notifs);
      return {
        complaint: newComplaint,
        ticket: matchedTicket,
        duplicate_outcome: 'likely_duplicate',
        is_simulated: true,
      };
    }

    // New standalone ticket (or uncertain_match held for manual officer confirmation)
    const ticketCode = `CL-2026-${Math.floor(420 + Math.random() * 570)}`;
    newComplaint.incident_ticket_code = ticketCode;

    const finalSeverity =
      SEVERITY_RANK[ai.layaSeverity] >= SEVERITY_RANK[ai.geminiSeverity]
        ? ai.layaSeverity
        : ai.geminiSeverity;
    const isCritical = finalSeverity === 'critical';
    const baseScore =
      finalSeverity === 'critical'
        ? 95
        : finalSeverity === 'high'
        ? 80
        : finalSeverity === 'medium'
        ? 55
        : 32;

    const aiEval: AIEvaluation = {
      id: `ai-${Date.now()}`,
      complaint_id: newComplaint.id,
      gemini_category: ai.category,
      gemini_severity: ai.geminiSeverity,
      gemini_confidence: ai.geminiConfidence,
      gemini_hazards: ai.hazards,
      gemini_summary: ai.summary,
      gemini_recommended_department: dept.name,
      detected_language: ai.detectedLanguage,
      laya_category: ai.category,
      laya_severity: ai.layaSeverity,
      laya_confidence: ai.layaConfidence,
      laya_rationale: ai.layaRationale,
      rules_triggered: ai.rulesTriggered,
      has_disagreement: ai.hasDisagreement,
      disagreement_summary: ai.disagreementSummary,
      embedding_model: 'paraphrase-multilingual-MiniLM-L12-v2',
      embedding_dimensions: 384,
      is_simulated: true,
      created_at: nowIso,
    };

    const uncertainMatchList: DuplicateMatch[] =
      duplicateOutcome === 'uncertain_match' && matchedTicket
        ? [
            {
              id: `dup-${Date.now()}`,
              source_complaint_code: complaintCode,
              source_title: newComplaint.title,
              source_description: newComplaint.description,
              source_created_at: nowIso,
              candidate_ticket_code: matchedTicket.ticket_code,
              distance_meters: bestDistance,
              semantic_similarity: bestSim,
              combined_likelihood: bestLikelihood,
              outcome: 'uncertain_match',
            },
          ]
        : [];

    const needsReview = ai.hasDisagreement || duplicateOutcome === 'uncertain_match';
    const reviewReasons: string[] = [];
    if (ai.hasDisagreement && ai.disagreementSummary) reviewReasons.push(ai.disagreementSummary);
    if (duplicateOutcome === 'uncertain_match' && matchedTicket) {
      reviewReasons.push(
        `Uncertain duplicate match (${Math.round(bestLikelihood * 100)}% likelihood) with ${matchedTicket.ticket_code} at ${bestDistance}m.`
      );
    }

    const newTicket: Ticket = {
      id: `tkt-${Date.now()}`,
      ticket_code: ticketCode,
      primary_complaint_code: complaintCode,
      summary: ai.summary,
      category: ai.category,
      severity: finalSeverity,
      severity_reason: ai.severityReason,
      priority_score: baseScore,
      is_critical_escalated: isCritical,
      department_code: dept.code,
      department_name: dept.name,
      status: 'OPEN',
      needs_human_review: needsReview,
      review_reason: reviewReasons.join(' '),
      duplicate_count: 1,
      location_label: newComplaint.location_label,
      latitude: payload.location.latitude,
      longitude: payload.location.longitude,
      location_accuracy_m: payload.location.accuracy_m,
      location_source: payload.location.source,
      is_simulated: true,
      created_at: nowIso,
      updated_at: nowIso,
      linked_complaints: [newComplaint],
      ai_evaluation: aiEval,
      duplicate_matches: uncertainMatchList,
      audit_logs: [
        {
          id: `aud-${Date.now()}-1`,
          ticket_code: ticketCode,
          complaint_code: complaintCode,
          actor_name: newComplaint.citizen_name,
          actor_role: 'citizen',
          action_type: 'COMPLAINT_SUBMITTED',
          summary: `Submitted ${complaintCode} via ${payload.location.source.toUpperCase()} location.`,
          created_at: nowIso,
        },
        {
          id: `aud-${Date.now()}-2`,
          ticket_code: ticketCode,
          complaint_code: complaintCode,
          actor_name: 'Simulated Demo Pipeline',
          actor_role: 'system',
          action_type: isCritical ? 'RULE_ESCALATION' : 'AI_EVALUATED',
          summary: `Simulated evaluation: ${CATEGORY_LABELS[ai.category]} · ${finalSeverity.toUpperCase()} (${dept.name}).`,
          created_at: nowIso,
        },
      ],
    };

    const nextTickets = [newTicket, ...tickets];
    notifs.unshift({
      id: `notif-${Date.now()}`,
      complaint_code: complaintCode,
      ticket_code: ticketCode,
      message: isCritical
        ? `Critical hazard ticket ${ticketCode} escalated to ${dept.name}.`
        : `Ticket ${ticketCode} created and routed to ${dept.name}.`,
      is_read: false,
      created_at: nowIso,
    });

    writeStoredTickets(nextTickets);
    writeStoredNotifications(notifs);

    return {
      complaint: newComplaint,
      ticket: newTicket,
      duplicate_outcome: duplicateOutcome,
      is_simulated: true,
    };
  }

  async transitionStatus(
    ticketCode: string,
    nextStatus: TicketStatus,
    actorName: string,
    actorRole: UserRole,
    mode: 'live' | 'demo',
    options?: {
      assigned_officer?: string;
      resolution_notes?: string;
      resolution_image_url?: string;
    }
  ): Promise<Ticket> {
    if (mode === 'live') {
      const res = await fetch(`${API_BASE}/api/v1/tickets/${ticketCode}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStatus,
          actor_name: actorName,
          assigned_officer: options?.assigned_officer,
          resolution_notes: options?.resolution_notes,
          resolution_image_url: options?.resolution_image_url,
        }),
      });
      if (!res.ok) throw new Error(`Failed to update status (${res.status})`);
      return await res.json();
    }

    const tickets = readStoredTickets();
    const notifs = readStoredNotifications();
    const target = tickets.find((t) => t.ticket_code === ticketCode);
    if (!target) throw new Error(`Ticket ${ticketCode} not found`);

    const prevStatus = target.status;
    const nowIso = new Date().toISOString();
    target.status = nextStatus;
    target.updated_at = nowIso;
    if (options?.assigned_officer) {
      target.assigned_officer = options.assigned_officer;
    }
    if (options?.resolution_notes) {
      target.resolution_notes = options.resolution_notes;
    }
    if (options?.resolution_image_url) {
      target.resolution_image_url = options.resolution_image_url;
    }
    if (nextStatus === 'RESOLVED') {
      target.resolved_at = nowIso;
    }

    const audit: AuditLogEntry = {
      id: `aud-${Date.now()}`,
      ticket_code: ticketCode,
      actor_name: actorName,
      actor_role: actorRole,
      action_type: 'STATUS_CHANGE',
      summary: `Lifecycle updated ${prevStatus} → ${nextStatus}${
        options?.resolution_notes ? `: ${options.resolution_notes}` : ''
      }`,
      previous_value: prevStatus,
      new_value: nextStatus,
      note: options?.resolution_notes,
      created_at: nowIso,
    };
    target.audit_logs.unshift(audit);

    for (const c of target.linked_complaints) {
      notifs.unshift({
        id: `notif-${Date.now()}-${c.complaint_code}`,
        complaint_code: c.complaint_code,
        ticket_code: ticketCode,
        message: `Ticket ${ticketCode} status updated to ${nextStatus}.${
          options?.resolution_notes ? ` Officer note: ${options.resolution_notes}` : ''
        }`,
        is_read: false,
        created_at: nowIso,
      });
    }

    writeStoredTickets(tickets);
    writeStoredNotifications(notifs);
    return target;
  }

  async overrideDecision(
    ticketCode: string,
    updates: {
      severity?: TicketSeverity;
      category?: ComplaintCategory;
      department_code?: string;
      reason: string;
    },
    actorName: string,
    actorRole: UserRole,
    mode: 'live' | 'demo'
  ): Promise<Ticket> {
    if (mode === 'live') {
      const res = await fetch(`${API_BASE}/api/v1/tickets/${ticketCode}/override`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updates, actor_name: actorName }),
      });
      if (!res.ok) throw new Error(`Failed to record override (${res.status})`);
      return await res.json();
    }

    const tickets = readStoredTickets();
    const target = tickets.find((t) => t.ticket_code === ticketCode);
    if (!target) throw new Error(`Ticket ${ticketCode} not found`);

    const nowIso = new Date().toISOString();
    const prevSummary = `${target.severity.toUpperCase()} / ${target.department_name}`;

    if (updates.severity) {
      target.severity = updates.severity;
      target.is_critical_escalated = updates.severity === 'critical';
      target.priority_score =
        updates.severity === 'critical'
          ? Math.max(95, target.priority_score)
          : updates.severity === 'high'
          ? 82
          : updates.severity === 'medium'
          ? 58
          : 34;
    }
    if (updates.category) {
      target.category = updates.category;
    }
    if (updates.department_code) {
      const dept = DEPARTMENTS.find((d) => d.code === updates.department_code);
      if (dept) {
        target.department_code = dept.code;
        target.department_name = dept.name;
      }
    }
    target.needs_human_review = false;
    target.updated_at = nowIso;

    target.audit_logs.unshift({
      id: `aud-${Date.now()}`,
      ticket_code: ticketCode,
      actor_name: actorName,
      actor_role: actorRole,
      action_type: 'HUMAN_OVERRIDE',
      summary: `Officer override applied: ${target.severity.toUpperCase()} / ${target.department_name}`,
      previous_value: prevSummary,
      new_value: `${target.severity.toUpperCase()} / ${target.department_name}`,
      note: updates.reason,
      created_at: nowIso,
    });

    writeStoredTickets(tickets);
    return target;
  }

  async resolveDuplicateMatch(
    ticketCode: string,
    matchId: string,
    decision: 'confirm_merge' | 'keep_separate',
    actorName: string,
    actorRole: UserRole,
    mode: 'live' | 'demo'
  ): Promise<Ticket[]> {
    if (mode === 'live') {
      const res = await fetch(`${API_BASE}/api/v1/duplicates/${matchId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, actor_name: actorName }),
      });
      if (!res.ok) throw new Error(`Duplicate resolution failed (${res.status})`);
      return await this.fetchTickets('live');
    }

    const tickets = readStoredTickets();
    const nowIso = new Date().toISOString();
    const sourceTicket = tickets.find((t) => t.ticket_code === ticketCode);
    if (!sourceTicket) throw new Error(`Ticket ${ticketCode} not found`);

    const match = sourceTicket.duplicate_matches.find((m) => m.id === matchId);
    if (!match) throw new Error('Duplicate candidate not found');

    if (decision === 'confirm_merge') {
      const targetTicket = tickets.find(
        (t) => t.ticket_code === match.candidate_ticket_code
      );
      if (targetTicket) {
        for (const cmp of sourceTicket.linked_complaints) {
          cmp.duplicate_outcome = 'likely_duplicate';
          cmp.incident_ticket_code = targetTicket.ticket_code;
          targetTicket.linked_complaints.push(cmp);
        }
        targetTicket.duplicate_count = targetTicket.linked_complaints.length;
        targetTicket.priority_score = Math.min(100, targetTicket.priority_score + 6);
        targetTicket.updated_at = nowIso;
        targetTicket.audit_logs.unshift({
          id: `aud-${Date.now()}`,
          ticket_code: targetTicket.ticket_code,
          complaint_code: match.source_complaint_code,
          actor_name: actorName,
          actor_role: actorRole,
          action_type: 'DUPLICATE_LINKED',
          summary: `Officer confirmed uncertain match and linked ${match.source_complaint_code} into ${targetTicket.ticket_code}.`,
          created_at: nowIso,
        });
        // Close superseded wrapper ticket cleanly while preserving complaint record inside targetTicket
        sourceTicket.status = 'CLOSED';
        sourceTicket.needs_human_review = false;
        sourceTicket.resolution_notes = `Merged into incident ${targetTicket.ticket_code} by ${actorName}.`;
        sourceTicket.audit_logs.unshift({
          id: `aud-${Date.now()}-src`,
          ticket_code: sourceTicket.ticket_code,
          actor_name: actorName,
          actor_role: actorRole,
          action_type: 'DUPLICATE_LINKED',
          summary: `Merged into ${targetTicket.ticket_code} and closed standalone placeholder.`,
          created_at: nowIso,
        });
      }
      match.outcome = 'likely_duplicate';
    } else {
      match.outcome = 'rejected';
      sourceTicket.needs_human_review = sourceTicket.ai_evaluation.has_disagreement;
      sourceTicket.audit_logs.unshift({
        id: `aud-${Date.now()}`,
        ticket_code: sourceTicket.ticket_code,
        complaint_code: match.source_complaint_code,
        actor_name: actorName,
        actor_role: actorRole,
        action_type: 'DUPLICATE_REJECTED',
        summary: `Officer rejected duplicate link with ${match.candidate_ticket_code}; kept as independent ticket.`,
        created_at: nowIso,
      });
    }

    match.reviewed_by = actorName;
    match.reviewed_at = nowIso;
    writeStoredTickets(tickets);
    return sortTicketsByPriority(tickets);
  }

  computeAnalytics(tickets: Ticket[]): AnalyticsOverview {
    const allComplaints = tickets.flatMap((t) => t.linked_complaints);
    const totalComplaints = allComplaints.length;
    const totalUnique = tickets.length;
    const pending = tickets.filter(
      (t) => t.status === 'OPEN' || t.status === 'ASSIGNED'
    ).length;
    const inProgress = tickets.filter((t) => t.status === 'IN_PROGRESS').length;
    const resolvedOrClosed = tickets.filter(
      (t) => t.status === 'RESOLVED' || t.status === 'CLOSED'
    ).length;
    const criticalAndHigh = tickets.filter(
      (t) => t.severity === 'critical' || t.severity === 'high'
    ).length;
    const dupLinked = Math.max(0, totalComplaints - totalUnique);
    const dupRate = totalComplaints > 0 ? Math.round((dupLinked / totalComplaints) * 100) : 0;
    const reviewCount = tickets.filter((t) => t.needs_human_review).length;

    const resolvedDurations = tickets
      .filter((t) => t.resolved_at)
      .map(
        (t) =>
          (new Date(t.resolved_at!).getTime() - new Date(t.created_at).getTime()) /
          3_600_000
      );
    const avgResolutionHours =
      resolvedDurations.length > 0
        ? Number(
            (
              resolvedDurations.reduce((acc, v) => acc + v, 0) /
              resolvedDurations.length
            ).toFixed(1)
          )
        : 6.4;

    const departmentBreakdown = DEPARTMENTS.map((dept) => {
      const deptTickets = tickets.filter((t) => t.department_code === dept.code);
      const openOrAssigned = deptTickets.filter(
        (t) => t.status === 'OPEN' || t.status === 'ASSIGNED'
      ).length;
      const deptInProgress = deptTickets.filter(
        (t) => t.status === 'IN_PROGRESS'
      ).length;
      const deptResolved = deptTickets.filter(
        (t) => t.status === 'RESOLVED' || t.status === 'CLOSED'
      ).length;
      const dRes = deptTickets
        .filter((t) => t.resolved_at)
        .map(
          (t) =>
            (new Date(t.resolved_at!).getTime() - new Date(t.created_at).getTime()) /
            3_600_000
        );
      const avgHrs =
        dRes.length > 0
          ? Number((dRes.reduce((a, b) => a + b, 0) / dRes.length).toFixed(1))
          : dept.sla_hours_high * 0.65;

      const slaPct =
        deptTickets.length === 0
          ? 100
          : Math.max(
              72,
              Math.min(
                100,
                Math.round(
                  ((deptTickets.length -
                    deptTickets.filter((t) => t.is_critical_escalated && t.status === 'OPEN')
                      .length) /
                    deptTickets.length) *
                    100
                )
              )
            );

      return {
        department_code: dept.code,
        department_name: dept.name,
        total: deptTickets.length,
        open_or_assigned: openOrAssigned,
        in_progress: deptInProgress,
        resolved_or_closed: deptResolved,
        avg_resolution_hours: Number(avgHrs.toFixed(1)),
        sla_compliance_pct: slaPct,
      };
    });

    // Cluster nearby tickets into hotspot zones (~450m grid)
    const hotspots: AnalyticsOverview['hotspots'] = [];
    for (const t of tickets) {
      const existing = hotspots.find(
        (h) => haversineMeters(h.latitude, h.longitude, t.latitude, t.longitude) <= 550
      );
      if (existing) {
        existing.incident_count += t.duplicate_count;
        if (t.severity === 'critical' || t.severity === 'high') {
          existing.critical_or_high_count += 1;
        }
      } else {
        hotspots.push({
          id: `hs-${t.ticket_code}`,
          area_name: t.location_label,
          latitude: t.latitude,
          longitude: t.longitude,
          incident_count: t.duplicate_count,
          critical_or_high_count:
            t.severity === 'critical' || t.severity === 'high' ? 1 : 0,
          dominant_category: t.category,
          recurring_issue_label: t.summary,
        });
      }
    }

    hotspots.sort((a, b) => b.incident_count - a.incident_count);

    return {
      total_complaints_received: totalComplaints,
      total_unique_tickets: totalUnique,
      pending_tickets: pending,
      in_progress_tickets: inProgress,
      resolved_or_closed_tickets: resolvedOrClosed,
      critical_and_high_count: criticalAndHigh,
      avg_resolution_hours: avgResolutionHours,
      duplicate_complaints_linked: dupLinked,
      duplicate_rate_pct: dupRate,
      human_review_flagged_count: reviewCount,
      department_breakdown: departmentBreakdown,
      hotspots,
    };
  }

  resetDemoState(): Ticket[] {
    const freshTickets = structuredClone(INITIAL_TICKETS);
    const freshNotifs = structuredClone(INITIAL_NOTIFICATIONS);
    writeStoredTickets(freshTickets);
    writeStoredNotifications(freshNotifs);
    return sortTicketsByPriority(freshTickets);
  }
}

export const apiClient = new CivicLensApiClient();
