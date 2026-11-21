import React, { useRef, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  Compass,
  FileCheck2,
  Loader2,
  MapPin,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { CATEGORY_LABELS, DEMO_SCENARIOS } from '../data/seedData';
import {
  CreateComplaintPayload,
  CreateComplaintResponse,
  GeoLocationData,
  PipelineStage,
} from '../types/civiclens';
import {
  DEFAULT_CITY_CENTER,
  detectBrowserLocation,
  extractExifLocation,
  formatCoordinates,
} from '../utils/geo';
import { LocationPickerMap } from './maps/CivicMap';
import { EvidenceImage, LifecycleBadge, ProvenanceNotice, SeverityBadge } from './StatusPrimitives';

interface CitizenIntakeViewProps {
  mode: 'live' | 'demo';
  onSubmitComplaint: (
    payload: CreateComplaintPayload,
    onStageChange: (stage: PipelineStage) => void
  ) => Promise<CreateComplaintResponse>;
  onOpenTracker: (code: string) => void;
  canOpenOfficerDesk: boolean;
  onOpenOfficerTicket: (ticketCode: string) => void;
}

const PIPELINE_STEPS: { id: PipelineStage; label: string }[] = [
  { id: 'submitted', label: 'Validating Complaint & Media' },
  { id: 'location_extracted', label: 'Extracting EXIF / GPS PostGIS Point' },
  { id: 'ai_classified', label: 'Gemini Pro Multimodal Analysis' },
  { id: 'decision_evaluated', label: 'Laya Typed Decisions & Rules Engine' },
  { id: 'embedding_generated', label: 'Multilingual Sentence Embeddings' },
  { id: 'duplicate_checked', label: 'PostGIS + pgvector Duplicate Check' },
  { id: 'ticket_routed', label: 'Priority Assignment & Routing' },
];

export function CitizenIntakeView({
  mode,
  onSubmitComplaint,
  onOpenTracker,
  canOpenOfficerDesk,
  onOpenOfficerTicket,
}: CitizenIntakeViewProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [languageHint, setLanguageHint] = useState('auto');
  const [citizenName, setCitizenName] = useState('');
  const [citizenContact, setCitizenContact] = useState('');
  const [locationLabel, setLocationLabel] = useState('');
  const [location, setLocation] = useState<GeoLocationData>({
    latitude: DEFAULT_CITY_CENTER.latitude,
    longitude: DEFAULT_CITY_CENTER.longitude,
    accuracy_m: 35,
    source: 'manual_map',
    address_label: 'City Center · Click map or use GPS',
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | undefined>(undefined);
  const [exifStatus, setExifStatus] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [currentStage, setCurrentStage] = useState<PipelineStage | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<CreateComplaintResponse | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function handleFileSelect(file: File | null) {
    if (!file) return;
    setImageFile(file);
    setExifStatus('Inspecting image EXIF metadata...');

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImagePreviewUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);

    const exifLoc = await extractExifLocation(file);
    if (exifLoc) {
      setLocation(exifLoc);
      if (!locationLabel) {
        setLocationLabel(exifLoc.address_label || 'Extracted from photo EXIF');
      }
      setExifStatus(
        `EXIF GPS coordinates extracted (${formatCoordinates(
          exifLoc.latitude,
          exifLoc.longitude
        )})`
      );
      setLocationError(null);
    } else {
      setExifStatus('No EXIF GPS metadata found in image; using map/browser location.');
    }
  }

  async function handleDetectGps() {
    setGpsLoading(true);
    setLocationError(null);
    try {
      const gpsLoc = await detectBrowserLocation();
      setLocation({
        ...gpsLoc,
        address_label: locationLabel || gpsLoc.address_label,
      });
    } catch (err) {
      setLocationError(
        err instanceof Error ? err.message : 'Unable to access browser GPS.'
      );
    } finally {
      setGpsLoading(false);
    }
  }

  function applyDemoScenario(scenarioId: string) {
    const preset = DEMO_SCENARIOS.find((s) => s.id === scenarioId);
    if (!preset) return;
    setTitle(preset.title);
    setDescription(preset.description);
    setLanguageHint(preset.language_hint);
    setLocationLabel(preset.location_label);
    setLocation({
      latitude: preset.latitude,
      longitude: preset.longitude,
      accuracy_m: 12,
      source: 'manual_map',
      address_label: preset.location_label,
    });
    setImageFile(null);
    setImagePreviewUrl(preset.image_url);
    setExifStatus(
      preset.image_url
        ? 'Loaded sample hazard photograph for demonstration.'
        : null
    );
    setReceipt(null);
    setSubmitError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!title.trim() || !description.trim()) {
      setSubmitError('Please provide both a complaint title and description.');
      return;
    }

    setSubmitting(true);
    setCurrentStage('submitted');
    try {
      const response = await onSubmitComplaint(
        {
          title: title.trim(),
          description: description.trim(),
          language_hint: languageHint,
          citizen_name: citizenName.trim() || 'Citizen Reporter',
          citizen_contact: citizenContact.trim() || 'Not provided',
          location: {
            ...location,
            address_label:
              locationLabel.trim() ||
              location.address_label ||
              formatCoordinates(location.latitude, location.longitude),
          },
          image_file: imageFile,
          image_preview_url: imagePreviewUrl,
        },
        (stage) => setCurrentStage(stage)
      );
      setReceipt(response);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Failed to submit complaint.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setTitle('');
    setDescription('');
    setLanguageHint('auto');
    setLocationLabel('');
    setImageFile(null);
    setImagePreviewUrl(undefined);
    setExifStatus(null);
    setReceipt(null);
    setCurrentStage(null);
    setSubmitError(null);
  }

  const activeStageIndex = currentStage
    ? PIPELINE_STEPS.findIndex((s) => s.id === currentStage)
    : -1;

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight text-balance">
            Report a Municipal Issue
          </h1>
          <p className="mt-1 text-sm text-slate-600 max-w-2xl">
            Submit a complaint in English or any regional language with optional photo evidence and GPS/map coordinates. CivicLens classifies hazards, checks duplicates, and routes directly to the responsible city department.
          </p>
        </div>

        {/* One-Click Demo Scenarios */}
        <div className="flex flex-col items-start lg:items-end gap-1.5">
          <span className="text-xs font-medium text-slate-500">
            Quick Demo Scenarios:
          </span>
          <div className="flex flex-wrap gap-2">
            {DEMO_SCENARIOS.map((sc) => (
              <button
                key={sc.id}
                type="button"
                onClick={() => applyDemoScenario(sc.id)}
                className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-md text-slate-700 hover:border-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
              >
                {sc.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {receipt ? (
        <div className="mt-6 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 max-w-4xl mx-auto">
          <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-slate-200">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Complaint Registered & Triaged
                </h2>
                <p className="text-sm text-slate-600 mt-0.5">
                  Complaint{' '}
                  <span className="font-mono font-semibold text-slate-900">
                    {receipt.complaint.complaint_code}
                  </span>{' '}
                  has been processed through the CivicLens pipeline.
                </p>
              </div>
            </div>
            <ProvenanceNotice isSimulated={receipt.is_simulated} />
          </div>

          {/* Duplicate Outcome Callout */}
          <div className="mt-5 p-4 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-medium text-slate-500">
                Duplicate & Incident Routing Result
              </div>
              <div className="text-sm font-semibold text-slate-900 mt-0.5">
                {receipt.duplicate_outcome === 'likely_duplicate'
                  ? `Linked to existing active incident ${receipt.ticket.ticket_code} (Your report was preserved and increased incident priority)`
                  : receipt.duplicate_outcome === 'uncertain_match'
                  ? `Created ticket ${receipt.ticket.ticket_code} and flagged a nearby uncertain duplicate candidate for officer confirmation`
                  : `Created new municipal ticket ${receipt.ticket.ticket_code}`}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <SeverityBadge severity={receipt.ticket.severity} />
              <LifecycleBadge status={receipt.ticket.status} />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-xs font-medium text-slate-500">Assigned Department</div>
                <div className="font-semibold text-slate-900">
                  {receipt.ticket.department_name}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500">
                  Category · Language Detected
                </div>
                <div className="text-slate-800">
                  {CATEGORY_LABELS[receipt.ticket.category]} ·{' '}
                  {receipt.complaint.detected_language}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500">
                  Structured Summary & Severity Rationale
                </div>
                <div className="font-medium text-slate-900">{receipt.ticket.summary}</div>
                <div className="text-slate-600 mt-1">{receipt.ticket.severity_reason}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500">
                  Location ({receipt.complaint.location_source.toUpperCase()})
                </div>
                <div className="font-mono text-xs text-slate-700 mt-0.5">
                  {receipt.complaint.location_label} ·{' '}
                  {formatCoordinates(
                    receipt.complaint.latitude,
                    receipt.complaint.longitude
                  )}{' '}
                  (±{receipt.complaint.location_accuracy_m}m)
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-slate-500 mb-2">
                Attached Photo Evidence
              </div>
              <EvidenceImage
                src={receipt.complaint.image_url}
                alt={receipt.complaint.title}
                className="w-full h-48 object-cover rounded-lg border border-slate-200"
              />
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Submit Another Complaint
            </button>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onOpenTracker(receipt.complaint.complaint_code)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 cursor-pointer"
              >
                Track Complaint ({receipt.complaint.complaint_code})
              </button>
              {canOpenOfficerDesk && (
                <button
                  type="button"
                  onClick={() => onOpenOfficerTicket(receipt.ticket.ticket_code)}
                  className="px-4 py-2 text-sm font-medium text-slate-900 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 cursor-pointer"
                >
                  Inspect in Officer Desk
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Complaint Form & Photo Evidence */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900">
                1. Issue Description & Evidence
              </h2>
              <ProvenanceNotice isSimulated={mode === 'demo'} compact />
            </div>

            {submitError && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800"
              >
                {submitError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label
                  htmlFor="complaint-title"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Complaint Title <span className="text-red-600">*</span>
                </label>
                <input
                  id="complaint-title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Broken streetlight pole with exposed wires"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>

              <div>
                <label
                  htmlFor="language-hint"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Input Language
                </label>
                <select
                  id="language-hint"
                  value={languageHint}
                  onChange={(e) => setLanguageHint(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="auto">Auto-Detect</option>
                  <option value="en">English</option>
                  <option value="hi">Hindi (हिन्दी)</option>
                  <option value="ta">Tamil (தமிழ்)</option>
                  <option value="te">Telugu (తెలుగు)</option>
                  <option value="kn">Kannada (ಕನ್ನಡ)</option>
                  <option value="mr">Marathi (मराठी)</option>
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="complaint-desc"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Detailed Description (English or Regional Language){' '}
                <span className="text-red-600">*</span>
              </label>
              <textarea
                id="complaint-desc"
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what happened, nearby landmarks (school, hospital, junction), and any immediate safety risk..."
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* Optional Image Upload + EXIF Extraction */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  Photo Evidence (Optional — Auto-extracts EXIF GPS if present)
                </label>
                {imagePreviewUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreviewUrl(undefined);
                      setExifStatus(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-xs text-slate-600 hover:text-red-700 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Remove Photo</span>
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
              />

              {imagePreviewUrl ? (
                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-2">
                  <img
                    src={imagePreviewUrl}
                    alt="Uploaded complaint evidence preview"
                    className="w-full h-48 object-cover rounded-md"
                  />
                  {exifStatus && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-700">
                      <Camera className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                      <span>{exifStatus}</span>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-600 hover:bg-blue-50/30 transition-colors cursor-pointer"
                >
                  <Upload className="w-5 h-5 text-slate-400 mx-auto mb-2" />
                  <div className="text-sm font-medium text-slate-800">
                    Upload photo evidence
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    JPEG or PNG · EXIF GPS coordinates are extracted automatically if embedded
                  </div>
                </button>
              )}
            </div>

            {/* Citizen Contact Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label
                  htmlFor="citizen-name"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Your Name
                </label>
                <input
                  id="citizen-name"
                  type="text"
                  value={citizenName}
                  onChange={(e) => setCitizenName(e.target.value)}
                  placeholder="Optional (defaults to Citizen Reporter)"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label
                  htmlFor="citizen-contact"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Phone or Email (For Status Alerts)
                </label>
                <input
                  id="citizen-contact"
                  type="text"
                  value={citizenContact}
                  onChange={(e) => setCitizenContact(e.target.value)}
                  placeholder="+91 98xxx xxxxx or email@example.org"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Location Selection (GPS / EXIF / Map) & Submit Pipeline */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <h2 className="text-base font-semibold text-slate-900">
                  2. Exact Incident Location
                </h2>
                <button
                  type="button"
                  onClick={handleDetectGps}
                  disabled={gpsLoading}
                  className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {gpsLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Compass className="w-3.5 h-3.5" />
                  )}
                  <span>Detect My GPS</span>
                </button>
              </div>

              {locationError && (
                <div className="p-2.5 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-800">
                  {locationError} Click anywhere on the map below to set the pin manually.
                </div>
              )}

              <div>
                <label
                  htmlFor="location-label"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Ward / Street / Landmark
                </label>
                <input
                  id="location-label"
                  type="text"
                  value={locationLabel}
                  onChange={(e) => setLocationLabel(e.target.value)}
                  placeholder="e.g., Ward 14 · Near Government High School Gate"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <LocationPickerMap
                location={location}
                onSelectLocation={({ latitude, longitude }) => {
                  setLocation({
                    latitude,
                    longitude,
                    accuracy_m: 15,
                    source: 'manual_map',
                    address_label:
                      locationLabel || `Manual Pin (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
                  });
                }}
                heightClass="h-64"
              />

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-700" />
                  <span className="font-mono">
                    {formatCoordinates(location.latitude, location.longitude)}
                  </span>
                </span>
                <span className="font-mono">
                  Source: {location.source.toUpperCase()} · ±{location.accuracy_m}m
                </span>
              </div>

              {/* Submit Button & Async Pipeline Progress */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Running AI Triage Pipeline...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Submit Complaint for AI Triage</span>
                    </>
                  )}
                </button>
              </div>

              {submitting && (
                <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
                  <div className="text-xs font-semibold text-slate-700">
                    Pipeline Execution Progress
                  </div>
                  {PIPELINE_STEPS.map((step, idx) => {
                    const isDone = idx < activeStageIndex;
                    const isCurrent = idx === activeStageIndex;
                    return (
                      <div
                        key={step.id}
                        className="flex items-center gap-2 text-xs"
                      >
                        {isDone ? (
                          <FileCheck2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : isCurrent ? (
                          <Loader2 className="w-3.5 h-3.5 text-blue-700 animate-spin shrink-0" />
                        ) : (
                          <span className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0" />
                        )}
                        <span
                          className={
                            isDone
                              ? 'text-slate-700 font-medium'
                              : isCurrent
                              ? 'text-blue-700 font-semibold'
                              : 'text-slate-400'
                          }
                        >
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
