import React, { useEffect, useMemo, useState } from 'react';
import { Bell, CheckCircle2, Lock, MapPin, Search } from 'lucide-react';
import { CATEGORY_LABELS, LIFECYCLE_ORDER } from '../data/seedData';
import { CitizenNotification, Ticket, UserRole } from '../types/civiclens';
import { formatCoordinates, formatDateTime } from '../utils/geo';
import { EvidenceImage, LifecycleBadge, ProvenanceNotice, SeverityBadge } from './StatusPrimitives';

interface CitizenTrackerViewProps {
  tickets: Ticket[];
  notifications: CitizenNotification[];
  initialSearchCode?: string;
  mySubmittedCodes: string[];
  viewerRole: UserRole | null;
  onMarkNotificationsRead: () => void;
}

export function CitizenTrackerView({
  tickets,
  notifications,
  initialSearchCode = '',
  mySubmittedCodes,
  viewerRole,
  onMarkNotificationsRead,
}: CitizenTrackerViewProps) {
  const [inputCode, setInputCode] = useState(initialSearchCode);
  const [submittedQuery, setSubmittedQuery] = useState(initialSearchCode);

  useEffect(() => {
    if (initialSearchCode) {
      setInputCode(initialSearchCode);
      setSubmittedQuery(initialSearchCode);
    }
  }, [initialSearchCode]);

  const matchedResult = useMemo(() => {
    const q = submittedQuery.trim().toUpperCase();
    if (!q) return null;
    for (const ticket of tickets) {
      if (ticket.ticket_code.toUpperCase() === q) {
        return { ticket, complaint: ticket.linked_complaints[0] };
      }
      const foundComplaint = ticket.linked_complaints.find(
        (c) => c.complaint_code.toUpperCase() === q
      );
      if (foundComplaint) {
        return { ticket, complaint: foundComplaint };
      }
    }
    return null;
  }, [submittedQuery, tickets]);

  const relatedNotifications = useMemo(() => {
    if (!matchedResult) return [];
    return notifications.filter(
      (n) =>
        n.ticket_code === matchedResult.ticket.ticket_code ||
        n.complaint_code === matchedResult.complaint?.complaint_code
    );
  }, [matchedResult, notifications]);

  const activeLifecycleIndex = matchedResult
    ? LIFECYCLE_ORDER.indexOf(matchedResult.ticket.status)
    : -1;

  const isStaff = viewerRole === 'officer' || viewerRole === 'admin';

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmittedQuery(inputCode.trim());
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header + Private ID Lookup Form */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Track Complaint & Resolution Status
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Enter your exact Complaint ID (<span className="font-mono">CMP-2026-XXXX</span>) or Incident ID (<span className="font-mono">CL-2026-XXXX</span>) to check live progress. Other citizens&apos; complaints are never listed publicly.
            </p>
          </div>

          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center gap-2 w-full md:w-[420px]"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="Enter Complaint ID (e.g., CMP-2026-...)"
                aria-label="Enter complaint or ticket ID"
                className="w-full pl-9 pr-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Check Status
            </button>
          </form>
        </div>

        {/* Show ONLY complaints submitted by this user in their own session */}
        {mySubmittedCodes.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-500">
              Your Submissions (This Session):
            </span>
            {mySubmittedCodes.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => {
                  setInputCode(code);
                  setSubmittedQuery(code);
                }}
                className={`px-2.5 py-1 text-xs font-mono rounded border transition-colors cursor-pointer ${
                  submittedQuery.toUpperCase() === code.toUpperCase()
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {code}
              </button>
            ))}
          </div>
        )}
      </div>

      {!submittedQuery.trim() ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-2">
          <Lock className="w-6 h-6 text-slate-400 mx-auto" />
          <h2 className="text-sm font-semibold text-slate-900">
            Enter a Complaint ID to View Status
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            For citizen privacy, public complaint records are not browsable. Submit a new complaint to receive your tracking ID, or enter an existing Complaint ID above.
          </p>
        </div>
      ) : matchedResult ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Lifecycle & Incident Details */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-mono">
                  <span>Complaint {matchedResult.complaint?.complaint_code}</span>
                  <span aria-hidden="true">·</span>
                  <span>Incident {matchedResult.ticket.ticket_code}</span>
                  <span aria-hidden="true">·</span>
                  <span>{CATEGORY_LABELS[matchedResult.ticket.category]}</span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 mt-1">
                  {matchedResult.ticket.summary}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <SeverityBadge severity={matchedResult.ticket.severity} />
                <LifecycleBadge status={matchedResult.ticket.status} />
              </div>
            </div>

            {/* 5-Stage Lifecycle Progress */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-700">
                  Municipal Resolution Lifecycle
                </span>
                <ProvenanceNotice isSimulated={matchedResult.ticket.is_simulated} compact />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {LIFECYCLE_ORDER.map((stage, idx) => {
                  const completed = idx <= activeLifecycleIndex;
                  const current = idx === activeLifecycleIndex;
                  return (
                    <div
                      key={stage}
                      className={`p-3 rounded-lg border text-xs ${
                        current
                          ? 'bg-blue-50 border-blue-600 text-blue-900'
                          : completed
                          ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                          : 'bg-slate-50 border-slate-200 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono font-semibold">{stage}</span>
                        {completed && (
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        )}
                      </div>
                      <div className="text-[11px] opacity-80">
                        {stage === 'OPEN'
                          ? 'Triaged & queued'
                          : stage === 'ASSIGNED'
                          ? 'Department assigned'
                          : stage === 'IN_PROGRESS'
                          ? 'Field crew active'
                          : stage === 'RESOLVED'
                          ? 'Work completed'
                          : 'Verified & closed'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Duplicate Link Notice (without exposing other citizens' PII) */}
            {matchedResult.complaint?.duplicate_outcome === 'likely_duplicate' && (
              <div className="p-3.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900">
                Your report (<span className="font-mono font-semibold">{matchedResult.complaint.complaint_code}</span>) was linked with nearby reports into active incident{' '}
                <span className="font-mono font-semibold">{matchedResult.ticket.ticket_code}</span> ({matchedResult.ticket.duplicate_count} total reports). Your original report remains preserved.
              </div>
            )}

            {/* Resolution Description & Proof */}
            {(matchedResult.ticket.resolution_notes ||
              matchedResult.ticket.resolution_image_url) && (
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 space-y-2">
                <div className="text-xs font-semibold text-emerald-900">
                  Department Resolution Summary
                </div>
                {matchedResult.ticket.resolution_notes && (
                  <p className="text-sm text-emerald-950">
                    {matchedResult.ticket.resolution_notes}
                  </p>
                )}
                {matchedResult.ticket.resolution_image_url && (
                  <EvidenceImage
                    src={matchedResult.ticket.resolution_image_url}
                    alt="Resolution evidence"
                    className="w-full max-w-md h-44 object-cover rounded-lg border border-emerald-200 mt-2"
                  />
                )}
              </div>
            )}

            {/* Submitted Report & Location (PII masked for public lookup) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-slate-100">
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-xs font-medium text-slate-500">
                    Assigned Department & Officer
                  </div>
                  <div className="font-semibold text-slate-900">
                    {matchedResult.ticket.department_name}
                    {matchedResult.ticket.assigned_officer
                      ? ` · ${matchedResult.ticket.assigned_officer}`
                      : ' · Pending officer assignment'}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500">
                    Report Description ({matchedResult.complaint?.detected_language})
                  </div>
                  <div className="text-slate-800 mt-0.5">
                    {matchedResult.complaint?.description}
                  </div>
                </div>
                {isStaff && matchedResult.complaint && (
                  <div className="text-xs text-slate-500">
                    Reporter Contact (Staff View): {matchedResult.complaint.citizen_name} ·{' '}
                    {matchedResult.complaint.citizen_contact}
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-xs font-mono text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                  <span>
                    {matchedResult.ticket.location_label} ·{' '}
                    {formatCoordinates(
                      matchedResult.ticket.latitude,
                      matchedResult.ticket.longitude
                    )}
                  </span>
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-slate-500 mb-1.5">
                  Submitted Evidence
                </div>
                <EvidenceImage
                  src={matchedResult.complaint?.image_url}
                  alt={matchedResult.complaint?.title || 'Complaint photo'}
                  className="w-full h-44 object-cover rounded-lg border border-slate-200"
                />
              </div>
            </div>
          </div>

          {/* Right: Ticket-Scoped Notifications & Public Audit Timeline */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-blue-700" />
                  <h3 className="text-sm font-semibold text-slate-900">
                    Ticket Notifications
                  </h3>
                </div>
                {relatedNotifications.length > 0 && (
                  <button
                    type="button"
                    onClick={onMarkNotificationsRead}
                    className="text-xs text-blue-700 hover:underline cursor-pointer"
                  >
                    Mark read
                  </button>
                )}
              </div>
              <div className="mt-3 space-y-2.5">
                {relatedNotifications.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">
                    No status alerts recorded yet for this ticket.
                  </p>
                ) : (
                  relatedNotifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 rounded-lg border text-xs ${
                        n.is_read
                          ? 'bg-slate-50 border-slate-200 text-slate-700'
                          : 'bg-blue-50/70 border-blue-200 text-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between font-mono text-[11px] text-slate-500 mb-1">
                        <span>{n.ticket_code}</span>
                        <span>{formatDateTime(n.created_at)}</span>
                      </div>
                      <p>{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-900 pb-3 border-b border-slate-100">
                Status History
              </h3>
              <div className="mt-3 space-y-3">
                {matchedResult.ticket.audit_logs.map((entry) => (
                  <div
                    key={entry.id}
                    className="pb-3 border-b border-slate-100 last:border-0 last:pb-0 text-xs"
                  >
                    <div className="flex items-center justify-between text-slate-500 font-mono text-[11px]">
                      <span>{entry.action_type}</span>
                      <span>{formatDateTime(entry.created_at)}</span>
                    </div>
                    <div className="text-slate-800 font-medium mt-0.5">
                      {entry.summary}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <p className="text-sm font-medium text-slate-800">
            No complaint or incident ticket matched “{submittedQuery}”.
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Double-check your Complaint ID (e.g., CMP-2026-XXXX) and try again.
          </p>
        </div>
      )}
    </div>
  );
}
