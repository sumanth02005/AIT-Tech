import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  GitMerge,
  History,
  MapPin,
  ShieldAlert,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { CATEGORY_LABELS, DEPARTMENTS, LIFECYCLE_ORDER } from '../data/seedData';
import {
  ComplaintCategory,
  Ticket,
  TicketSeverity,
  TicketStatus,
} from '../types/civiclens';
import { formatCoordinates, formatDateTime } from '../utils/geo';
import {
  EvidenceImage,
  LifecycleBadge,
  ProvenanceNotice,
  SeverityBadge,
} from './StatusPrimitives';

interface TicketInspectionDrawerProps {
  ticket: Ticket | null;
  sessionRole: 'officer' | 'admin';
  onClose: () => void;
  onTransitionStatus: (
    ticketCode: string,
    nextStatus: TicketStatus,
    options?: {
      assigned_officer?: string;
      resolution_notes?: string;
      resolution_image_url?: string;
    }
  ) => Promise<void>;
  onOverrideDecision: (
    ticketCode: string,
    updates: {
      severity?: TicketSeverity;
      category?: ComplaintCategory;
      department_code?: string;
      reason: string;
    }
  ) => Promise<void>;
  onResolveDuplicate: (
    ticketCode: string,
    matchId: string,
    decision: 'confirm_merge' | 'keep_separate'
  ) => Promise<void>;
}

type DrawerTab = 'overview' | 'ai' | 'duplicates' | 'lifecycle';

export function TicketInspectionDrawer({
  ticket,
  sessionRole,
  onClose,
  onTransitionStatus,
  onOverrideDecision,
  onResolveDuplicate,
}: TicketInspectionDrawerProps) {
  const [activeTab, setActiveTab] = useState<DrawerTab>('overview');
  const [assignedOfficer, setAssignedOfficer] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolutionImageUrl, setResolutionImageUrl] = useState<string | undefined>(
    undefined
  );

  const [overrideSeverity, setOverrideSeverity] = useState<TicketSeverity>('medium');
  const [overrideCategory, setOverrideCategory] =
    useState<ComplaintCategory>('roads');
  const [overrideDept, setOverrideDept] = useState('ROADS');
  const [overrideReason, setOverrideReason] = useState('');

  const [busyAction, setBusyAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!ticket) return;
    setAssignedOfficer(ticket.assigned_officer || '');
    setResolutionNotes(ticket.resolution_notes || '');
    setResolutionImageUrl(ticket.resolution_image_url);
    setOverrideSeverity(ticket.severity);
    setOverrideCategory(ticket.category);
    setOverrideDept(ticket.department_code);
    setOverrideReason('');
    setActionError(null);
  }, [ticket?.ticket_code]);

  if (!ticket) return null;

  const uncertainMatches = ticket.duplicate_matches.filter(
    (m) => m.outcome === 'uncertain_match'
  );

  async function handleStatusAction(nextStatus: TicketStatus) {
    if (!ticket) return;
    setActionError(null);
    if (nextStatus === 'RESOLVED' && !resolutionNotes.trim()) {
      setActionError(
        'Please enter a resolution summary describing the action taken before marking RESOLVED.'
      );
      setActiveTab('lifecycle');
      return;
    }
    setBusyAction(true);
    try {
      await onTransitionStatus(ticket.ticket_code, nextStatus, {
        assigned_officer: assignedOfficer.trim() || undefined,
        resolution_notes: resolutionNotes.trim() || undefined,
        resolution_image_url: resolutionImageUrl,
      });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Status update failed.');
    } finally {
      setBusyAction(false);
    }
  }

  async function handleOverrideSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ticket) return;
    setActionError(null);
    if (!overrideReason.trim()) {
      setActionError('An audit reason is required whenever overriding AI or Laya decisions.');
      return;
    }
    setBusyAction(true);
    try {
      await onOverrideDecision(ticket.ticket_code, {
        severity: overrideSeverity,
        category: overrideCategory,
        department_code: overrideDept,
        reason: overrideReason.trim(),
      });
      setOverrideReason('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Override failed.');
    } finally {
      setBusyAction(false);
    }
  }

  function handleResolutionImageUpload(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setResolutionImageUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  const currentStageIdx = LIFECYCLE_ORDER.indexOf(ticket.status);

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-slate-900/35"
      role="dialog"
      aria-modal="true"
      aria-label={`Inspect ticket ${ticket.ticket_code}`}
    >
      <div className="w-full max-w-2xl bg-white h-full border-l border-slate-200 flex flex-col shadow-xl">
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-bold text-slate-900">
                {ticket.ticket_code}
              </span>
              <SeverityBadge severity={ticket.severity} />
              <LifecycleBadge status={ticket.status} />
              <span className="font-mono text-xs text-slate-500">
                Priority {ticket.priority_score}
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900 mt-1.5">
              {ticket.summary}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>{ticket.department_name}</span>
              <span aria-hidden="true">·</span>
              <span>{ticket.location_label}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close inspection drawer"
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Review / Disagreement Callout */}
        {(ticket.needs_human_review || uncertainMatches.length > 0) && (
          <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-200 text-xs text-amber-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong>Human Verification Requested:</strong>{' '}
              {ticket.review_reason ||
                'Conflicting AI confidence or uncertain duplicate candidate requires officer sign-off.'}
            </div>
          </div>
        )}

        {/* Drawer Tabs */}
        <div className="px-6 border-b border-slate-200 flex items-center gap-5 text-xs font-semibold overflow-x-auto">
          {[
            { id: 'overview', label: `Evidence (${ticket.linked_complaints.length})` },
            { id: 'ai', label: 'AI vs. Laya & Override' },
            {
              id: 'duplicates',
              label: `Duplicates (${ticket.duplicate_matches.length})`,
            },
            { id: 'lifecycle', label: `Lifecycle & Audit (${ticket.audit_logs.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as DrawerTab)}
              className={`py-3 border-b-2 whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'border-blue-700 text-blue-700'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {actionError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
              {actionError}
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-1.5 text-xs font-mono text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-blue-700" />
                  <span>
                    {formatCoordinates(ticket.latitude, ticket.longitude)} (±
                    {ticket.location_accuracy_m}m · {ticket.location_source.toUpperCase()})
                  </span>
                </div>
                <ProvenanceNotice isSimulated={ticket.is_simulated} compact />
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Preserved Citizen Complaint Records ({ticket.linked_complaints.length})
                </h3>
                {ticket.linked_complaints.map((cmp, index) => (
                  <div
                    key={cmp.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-mono font-semibold text-slate-900">
                        {cmp.complaint_code} {index === 0 ? '(Primary)' : '(Linked Report)'}
                      </span>
                      <span className="text-slate-500">
                        {cmp.citizen_name} · {cmp.citizen_contact} ·{' '}
                        {formatDateTime(cmp.created_at)}
                      </span>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        {cmp.title}
                      </div>
                      <p className="text-sm text-slate-700 mt-1">{cmp.description}</p>
                      <div className="text-xs text-slate-500 mt-1">
                        Language: {cmp.detected_language} · Location Source:{' '}
                        {cmp.location_source.toUpperCase()}
                      </div>
                    </div>
                    {cmp.image_url && (
                      <EvidenceImage
                        src={cmp.image_url}
                        alt={cmp.title}
                        className="w-full h-52 object-cover rounded-lg border border-slate-200"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">
                  Independent Model & Policy Verification
                </h3>
                <ProvenanceNotice isSimulated={ticket.ai_evaluation.is_simulated} />
              </div>

              {/* Gemini vs Laya Comparison */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900 inline-flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-700" />
                      <span>Gemini Pro Multimodal</span>
                    </span>
                    <span className="font-mono text-xs text-slate-600">
                      Conf {Math.round(ticket.ai_evaluation.gemini_confidence * 100)}%
                    </span>
                  </div>
                  <div className="text-xs text-slate-700 space-y-1">
                    <div>
                      Category:{' '}
                      <strong>
                        {CATEGORY_LABELS[ticket.ai_evaluation.gemini_category]}
                      </strong>
                    </div>
                    <div>
                      Severity:{' '}
                      <strong className="uppercase">
                        {ticket.ai_evaluation.gemini_severity}
                      </strong>
                    </div>
                    <div>
                      Hazards:{' '}
                      <span>{ticket.ai_evaluation.gemini_hazards.join(', ')}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900 inline-flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-slate-700" />
                      <span>Laya Typed Decisions</span>
                    </span>
                    <span className="font-mono text-xs text-slate-600">
                      Conf {Math.round(ticket.ai_evaluation.laya_confidence * 100)}%
                    </span>
                  </div>
                  <div className="text-xs text-slate-700 space-y-1">
                    <div>
                      Category:{' '}
                      <strong>
                        {CATEGORY_LABELS[ticket.ai_evaluation.laya_category]}
                      </strong>
                    </div>
                    <div>
                      Severity:{' '}
                      <strong className="uppercase">
                        {ticket.ai_evaluation.laya_severity}
                      </strong>
                    </div>
                    <div className="text-slate-600">
                      {ticket.ai_evaluation.laya_rationale}
                    </div>
                  </div>
                </div>
              </div>

              {/* Python Rules & Embeddings */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="font-semibold text-slate-900">
                  Python Rules Engine & Multilingual Embedding Vector
                </div>
                <div className="text-slate-700">
                  Rules Triggered:{' '}
                  <span className="font-mono">
                    {ticket.ai_evaluation.rules_triggered.length > 0
                      ? ticket.ai_evaluation.rules_triggered.join(' · ')
                      : 'None'}
                  </span>
                </div>
                <div className="text-slate-700">
                  Semantic Embedding:{' '}
                  <span className="font-mono">
                    {ticket.ai_evaluation.embedding_model} (
                    {ticket.ai_evaluation.embedding_dimensions}-dim pgvector)
                  </span>
                </div>
                {ticket.ai_evaluation.has_disagreement && (
                  <div className="text-amber-900 font-medium pt-1">
                    Disagreement Notice: {ticket.ai_evaluation.disagreement_summary}
                  </div>
                )}
              </div>

              {/* Officer Override Form */}
              <form
                onSubmit={handleOverrideSubmit}
                className="p-4 rounded-xl border border-slate-200 space-y-3"
              >
                <div className="text-sm font-semibold text-slate-900">
                  Officer Classification / Department Override
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Severity
                    </label>
                    <select
                      value={overrideSeverity}
                      onChange={(e) =>
                        setOverrideSeverity(e.target.value as TicketSeverity)
                      }
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md"
                    >
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Category
                    </label>
                    <select
                      value={overrideCategory}
                      onChange={(e) =>
                        setOverrideCategory(e.target.value as ComplaintCategory)
                      }
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md"
                    >
                      {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Department {sessionRole === 'officer' && '(Admin Only)'}
                    </label>
                    <select
                      value={overrideDept}
                      disabled={sessionRole === 'officer'}
                      onChange={(e) => setOverrideDept(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md disabled:bg-slate-100 disabled:text-slate-500"
                    >
                      {DEPARTMENTS.map((d) => (
                        <option key={d.code} value={d.code}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Audit Override Reason <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="Explain why AI/Laya decision is being confirmed or overridden..."
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md"
                  />
                </div>
                <button
                  type="submit"
                  disabled={busyAction}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 cursor-pointer disabled:opacity-60"
                >
                  Save Audited Override
                </button>
              </form>
            </div>
          )}

          {activeTab === 'duplicates' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  PostGIS + pgvector Duplicate Evaluation
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  New citizen complaints are never discarded. Likely duplicates link automatically; uncertain matches await manual confirmation.
                </p>
              </div>

              {ticket.duplicate_matches.length === 0 ? (
                <div className="p-6 rounded-xl border border-slate-200 bg-slate-50 text-center text-xs text-slate-600">
                  No duplicate candidates or linked merge records on this ticket yet.
                </div>
              ) : (
                ticket.duplicate_matches.map((m) => (
                  <div
                    key={m.id}
                    className="p-4 rounded-xl border border-slate-200 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="inline-flex items-center gap-1.5 font-mono font-semibold text-slate-900">
                        <GitMerge className="w-3.5 h-3.5 text-blue-700" />
                        <span>
                          {m.source_complaint_code} ↔ Candidate {m.candidate_ticket_code}
                        </span>
                      </span>
                      <span className="font-mono text-slate-700">
                        {m.distance_meters}m · {Math.round(m.semantic_similarity * 100)}% semantic ·{' '}
                        {Math.round(m.combined_likelihood * 100)}% combined
                      </span>
                    </div>

                    <div className="text-xs text-slate-700">
                      <div className="font-semibold text-slate-900">{m.source_title}</div>
                      <p className="mt-0.5">{m.source_description}</p>
                    </div>

                    {m.outcome === 'uncertain_match' ? (
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          disabled={busyAction}
                          onClick={() =>
                            onResolveDuplicate(
                              ticket.ticket_code,
                              m.id,
                              'confirm_merge'
                            )
                          }
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 rounded-md hover:bg-blue-800 cursor-pointer"
                        >
                          Confirm Duplicate & Link to {m.candidate_ticket_code}
                        </button>
                        <button
                          type="button"
                          disabled={busyAction}
                          onClick={() =>
                            onResolveDuplicate(
                              ticket.ticket_code,
                              m.id,
                              'keep_separate'
                            )
                          }
                          className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer"
                        >
                          Keep as Separate Incident
                        </button>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 font-mono">
                        Status: {m.outcome.toUpperCase()}{' '}
                        {m.reviewed_by ? `· Reviewed by ${m.reviewed_by}` : ''}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'lifecycle' && (
            <div className="space-y-6">
              {/* Lifecycle Transition Controls */}
              <div className="p-4 rounded-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Department Action & Lifecycle (OPEN → CLOSED)
                  </h3>
                  <LifecycleBadge status={ticket.status} />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Assigned Field Officer
                  </label>
                  <input
                    type="text"
                    value={assignedOfficer}
                    onChange={(e) => setAssignedOfficer(e.target.value)}
                    placeholder="e.g., R. Deshmukh (Duty Engineer)"
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Resolution Description / Work Notes
                  </label>
                  <textarea
                    rows={3}
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="Document dispatch crew notes, repairs performed, and safety verification..."
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Resolution Supporting Evidence (Optional)
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-300 rounded-md hover:bg-slate-100 cursor-pointer inline-flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Repair Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          handleResolutionImageUpload(e.target.files?.[0] ?? null)
                        }
                      />
                    </label>
                    {resolutionImageUrl && (
                      <span className="text-xs text-emerald-700 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Evidence attached</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                  {LIFECYCLE_ORDER.map((stage, idx) => {
                    const isCurrent = stage === ticket.status;
                    const isNextValid = idx === currentStageIdx + 1 || idx > currentStageIdx;
                    const restrictedAdminClosure =
                      stage === 'CLOSED' && sessionRole !== 'admin';
                    return (
                      <button
                        key={stage}
                        type="button"
                        disabled={
                          busyAction ||
                          isCurrent ||
                          !isNextValid ||
                          restrictedAdminClosure
                        }
                        onClick={() => handleStatusAction(stage)}
                        title={
                          restrictedAdminClosure
                            ? 'Final ticket closure (CLOSED) requires City Admin verification'
                            : undefined
                        }
                        className={`px-3 py-1.5 text-xs font-mono font-semibold rounded-md border transition-colors ${
                          isCurrent
                            ? 'bg-slate-900 text-white border-slate-900'
                            : isNextValid && !restrictedAdminClosure
                            ? 'bg-blue-700 text-white border-blue-700 hover:bg-blue-800 cursor-pointer'
                            : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                        }`}
                      >
                        {stage}
                        {restrictedAdminClosure ? ' (Admin)' : ''}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Immutable Audit Log */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <History className="w-4 h-4 text-slate-600" />
                  <span>Ticket Audit Trail</span>
                </div>
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
                  {ticket.audit_logs.map((log) => (
                    <div key={log.id} className="p-3.5 text-xs space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-slate-500">
                        <span>
                          {log.action_type} · {log.actor_name} ({log.actor_role})
                        </span>
                        <span>{formatDateTime(log.created_at)}</span>
                      </div>
                      <div className="text-slate-800 font-medium">{log.summary}</div>
                      {log.note && (
                        <div className="text-slate-600">Note: {log.note}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
