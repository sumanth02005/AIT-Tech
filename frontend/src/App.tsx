import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronRight,
  CircleDot,
  Clock3,
  Crosshair,
  LayoutDashboard,
  LoaderCircle,
  MapPin,
  MessageSquareText,
  Navigation,
  Plus,
  Search,
  ShieldCheck,
  Upload,
} from 'lucide-react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8005'

type View = 'report' | 'operations'

type Ticket = {
  id: string
  incident_id: string
  category: string
  severity: string
  department: string
  priority: number
  status: string
  human_review_required: boolean
  incidents?: {
    summary?: string
    latitude?: number
    longitude?: number
  }
}

type Analytics = {
  total_complaints: number
  processed_complaints: number
  resolved_complaints: number
  tickets_by_department: Record<string, number>
  critical_tickets: number
}

function App() {
  const [view, setView] = useState<View>('report')
  const [description, setDescription] = useState('')
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [latitude, setLatitude] = useState<number | ''>('')
  const [longitude, setLongitude] = useState<number | ''>('')
  const [locationLabel, setLocationLabel] = useState('Select location')
  const [locating, setLocating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [receipt, setReceipt] = useState<{ id: string; status: string } | null>(null)
  const [error, setError] = useState('')
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)

  useEffect(() => {
    if (view === 'operations') refreshOperations()
  }, [view])

  async function refreshOperations() {
    try {
      const [ticketResponse, analyticsResponse] = await Promise.all([
        fetch(`${API_URL}/api/tickets`),
        fetch(`${API_URL}/api/analytics/summary`),
      ])
      if (!ticketResponse.ok || !analyticsResponse.ok) throw new Error('Could not load operations data')
      setTickets(await ticketResponse.json())
      setAnalytics(await analyticsResponse.json())
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load operations data')
    }
  }

  function useLocation() {
    if (!navigator.geolocation) {
      setError('Location is not supported by this browser')
      return
    }
    setLocating(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude)
        setLongitude(position.coords.longitude)
        setLocationLabel(`${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`)
        setLocating(false)
      },
      () => {
        setError('We could not access your location. Enter a location manually.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (description.trim().length < 10) {
      setError('Describe the issue in at least 10 characters.')
      return
    }
    setSubmitting(true)
    setReceipt(null)
    try {
      const form = new FormData()
      form.append('description', description.trim())
      if (name.trim()) form.append('citizen_name', name.trim())
      if (contact.trim()) form.append('citizen_contact', contact.trim())
      if (latitude !== '') form.append('latitude', String(latitude))
      if (longitude !== '') form.append('longitude', String(longitude))
      if (photo) form.append('photo', photo)

      const response = await fetch(`${API_URL}/api/complaints`, {
        method: 'POST',
        body: form,
      })
      if (!response.ok) throw new Error('The complaint could not be sent')
      const result = await response.json()
      setReceipt({ id: result.id, status: result.status })
      setDescription('')
      setName('')
      setContact('')
      setPhoto(null)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'The complaint could not be sent')
    } finally {
      setSubmitting(false)
    }
  }

  async function updateTicket(ticket: Ticket, status: string) {
    setError('')
    try {
      const response = await fetch(`${API_URL}/api/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!response.ok) throw new Error('The ticket could not be updated')
      await refreshOperations()
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'The ticket could not be updated')
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setView('report')} aria-label="CivicLens report page">
          <span className="brand-mark"><CircleDot size={22} strokeWidth={2.4} /></span>
          <span>CivicLens</span>
        </button>
        <nav className="view-switch" aria-label="Primary">
          <button className={view === 'report' ? 'active' : ''} onClick={() => setView('report')}>
            <MessageSquareText size={16} /> Report
          </button>
          <button className={view === 'operations' ? 'active' : ''} onClick={() => setView('operations')}>
            <LayoutDashboard size={16} /> Operations
          </button>
        </nav>
        <div className="service-state"><span /> Network active</div>
      </header>

      {view === 'report' ? (
        <main className="report-layout">
          <section className="report-copy">
            <p className="eyebrow">Public issue desk <span>01</span></p>
            <h1>Report what<br />needs <em>attention.</em></h1>
            <p className="lede">
              Add the facts. CivicLens routes the report to the right municipal team and shows when action begins.
            </p>
            <div className="signal-strip">
              <span><ShieldCheck size={18} /> Reviewed by rules</span>
              <span><MapPin size={18} /> Location-aware</span>
            </div>
          </section>

          <section className="report-card">
            {receipt ? (
              <div className="receipt">
                <div className="receipt-check"><Check size={32} /></div>
                <p className="eyebrow">Report received</p>
                <h2>Your signal is in the system.</h2>
                <div className="receipt-id">
                  <span>Reference</span>
                  <strong>{receipt.id.slice(0, 8).toUpperCase()}</strong>
                </div>
                <p>We are analyzing the report and creating the appropriate municipal ticket.</p>
                <button className="secondary-action" onClick={() => setReceipt(null)}>
                  <Plus size={17} /> Report another issue
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="form-heading">
                  <div>
                    <p className="step-label">New report</p>
                    <h2>What happened?</h2>
                  </div>
                  <span className="form-count">{description.length}/5000</span>
                </div>

                <label className="field">
                  <span>Description</span>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Describe the hazard, damage, or issue..."
                    maxLength={5000}
                  />
                </label>

                <div className="location-panel">
                  <div className="location-copy">
                    <MapPin size={18} />
                    <div>
                      <span>Location</span>
                      <strong>{locationLabel}</strong>
                    </div>
                  </div>
                  <button type="button" className="icon-action" onClick={useLocation} disabled={locating}>
                    {locating ? <LoaderCircle className="spin" size={18} /> : <Crosshair size={18} />}
                    {locating ? 'Locating' : 'Use current'}
                  </button>
                </div>

                <div className="coordinates">
                  <label className="field compact">
                    <span>Latitude</span>
                    <input type="number" step="any" value={latitude} onChange={(event) => setLatitude(event.target.value === '' ? '' : Number(event.target.value))} placeholder="12.9716" />
                  </label>
                  <label className="field compact">
                    <span>Longitude</span>
                    <input type="number" step="any" value={longitude} onChange={(event) => setLongitude(event.target.value === '' ? '' : Number(event.target.value))} placeholder="77.5946" />
                  </label>
                </div>

                <div className="details-grid">
                  <label className="field">
                    <span>Your name <small>optional</small></span>
                    <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" />
                  </label>
                  <label className="field">
                    <span>Contact <small>optional</small></span>
                    <input value={contact} onChange={(event) => setContact(event.target.value)} placeholder="Phone or email" />
                  </label>
                </div>

                <label className="upload">
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setPhoto(event.target.files?.[0] || null)} />
                  <Upload size={19} />
                  <span>{photo ? photo.name : 'Add a photo'} <small>{photo ? 'Ready to upload' : 'Optional evidence'}</small></span>
                  <ChevronRight size={18} />
                </label>

                {error && <div className="error-message"><AlertTriangle size={17} /> {error}</div>}
                <button className="submit-action" type="submit" disabled={submitting}>
                  {submitting ? <LoaderCircle className="spin" size={18} /> : <ArrowRight size={18} />}
                  {submitting ? 'Sending report' : 'Send report'}
                </button>
              </form>
            )}
          </section>
        </main>
      ) : (
        <main className="operations-layout">
          <aside className="operations-side">
            <p className="eyebrow">Control center <span>02</span></p>
            <h1>City<br />signals.</h1>
            <div className="metric-stack">
              <div><span>Total reports</span><strong>{analytics?.total_complaints ?? '—'}</strong></div>
              <div><span>Processed</span><strong>{analytics?.processed_complaints ?? '—'}</strong></div>
              <div className="critical"><span>Critical</span><strong>{analytics?.critical_tickets ?? '—'}</strong></div>
            </div>
          </aside>

          <section className="operations-main">
            <div className="operations-toolbar">
              <div>
                <p className="step-label">Live queue</p>
                <h2>Priority reports</h2>
              </div>
              <button className="search-action" aria-label="Search reports"><Search size={18} /></button>
              <button className="refresh-action" onClick={refreshOperations}>Refresh</button>
            </div>

            {error && <div className="error-message"><AlertTriangle size={17} /> {error}</div>}

            <div className="ticket-list">
              {tickets.length === 0 ? (
                <div className="empty-state">
                  <CircleDot size={30} />
                  <h3>No reports in the queue</h3>
                  <p>New citizen reports will appear here automatically.</p>
                </div>
              ) : tickets.map((ticket, index) => (
                <article className="ticket-row" key={ticket.id}>
                  <div className={`priority-mark severity-${ticket.severity.toLowerCase()}`}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                  </div>
                  <div className="ticket-main">
                    <div className="ticket-tags">
                      <span>{ticket.category}</span>
                      {ticket.human_review_required && <span className="review">Review</span>}
                    </div>
                    <h3>{ticket.incidents?.summary || 'Citizen complaint'}</h3>
                    <div className="ticket-meta">
                      <span><Navigation size={14} /> {ticket.department}</span>
                      <span><Clock3 size={14} /> {ticket.status}</span>
                    </div>
                  </div>
                  <div className="ticket-score">
                    <span>Priority</span>
                    <strong>{ticket.priority}</strong>
                  </div>
                  <select
                    value={ticket.status}
                    onChange={(event) => updateTicket(ticket, event.target.value)}
                    aria-label={`Update ticket ${ticket.id}`}
                  >
                    <option>OPEN</option>
                    <option>ASSIGNED</option>
                    <option>IN_PROGRESS</option>
                    <option>RESOLVED</option>
                    <option>CLOSED</option>
                  </select>
                </article>
              ))}
            </div>
          </section>
        </main>
      )}
    </div>
  )
}

export default App
