import { useEffect, useState, useCallback } from 'react'
import { leadsApi, exportApi } from '../api'

const STATUS_OPTIONS = ['new', 'contacted', 'qualified', 'converted', 'archived']
const SOURCE_OPTIONS = ['csv', 'excel', 'linkedin', 'web_scrape', 'manual']

function Badge({ value, type }) {
  const cls = `badge badge-${value?.replace(/\s/g, '_').toLowerCase() || 'new'}`
  return <span className={cls}>{value || '—'}</span>
}

function LeadModal({ lead, onClose, onSave }) {
  const [form, setForm] = useState({ ...lead })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await (lead.id ? leadsApi.update(lead.id, form) : leadsApi.create(form))
      onSave()
    } catch (e) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  const fields = [
    ['company_name', 'Company Name'], ['contact_name', 'Contact Name'],
    ['email', 'Email'], ['phone', 'Phone'],
    ['website', 'Website'], ['linkedin_url', 'LinkedIn URL'],
    ['industry', 'Industry'], ['company_size', 'Company Size'],
    ['location', 'Location'],
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div className="card" style={{ width: 600, maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, alignItems: 'center' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>{lead.id ? 'Edit Lead' : 'Add Lead'}</h2>
          <button className="btn-secondary" onClick={onClose}>✕</button>
        </div>
        <div className="form-row">
          {fields.map(([k, label]) => (
            <div className="form-group" key={k}>
              <label>{label}</label>
              <input value={form[k] || ''} onChange={e => set(k, e.target.value)} />
            </div>
          ))}
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Status</label>
            <select value={form.status || 'new'} onChange={e => set('status', e.target.value)}>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Source</label>
            <select value={form.source || 'manual'} onChange={e => set('source', e.target.value)}>
              {SOURCE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>Notes</label>
          <textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <span className="spinner" /> : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function LeadsTable() {
  const [leads, setLeads] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [source, setSource] = useState('')
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [editLead, setEditLead] = useState(null)
  const [error, setError] = useState(null)

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await leadsApi.list({ page, page_size: PAGE_SIZE, search: search || undefined, status: status || undefined, source: source || undefined })
      setLeads(data.leads)
      setTotal(data.total)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [page, search, status, source])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  const toggleSelect = (id) => {
    setSelected(s => {
      const ns = new Set(s)
      ns.has(id) ? ns.delete(id) : ns.add(id)
      return ns
    })
  }

  const selectAll = () => {
    if (selected.size === leads.length) setSelected(new Set())
    else setSelected(new Set(leads.map(l => l.id)))
  }

  const deleteSelected = async () => {
    if (!window.confirm(`Delete ${selected.size} lead(s)?`)) return
    try {
      await leadsApi.bulkDelete([...selected])
      setSelected(new Set())
      fetchLeads()
    } catch (e) { alert(e.message) }
  }

  const deleteLead = async (id) => {
    if (!window.confirm('Delete this lead?')) return
    try {
      await leadsApi.delete(id)
      fetchLeads()
    } catch (e) { alert(e.message) }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="page">
      {editLead && (
        <LeadModal
          lead={editLead}
          onClose={() => setEditLead(null)}
          onSave={() => { setEditLead(null); fetchLeads() }}
        />
      )}

      <div className="page-header">
        <h1 className="page-title">Leads <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 400 }}>({total})</span></h1>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <button className="btn-danger" onClick={deleteSelected}>🗑 Delete ({selected.size})</button>
          )}
          <a href={exportApi.csvUrl({ status: status || undefined, source: source || undefined })} download>
            <button className="btn-secondary">⬇ CSV</button>
          </a>
          <a href={exportApi.excelUrl({ status: status || undefined, source: source || undefined })} download>
            <button className="btn-secondary">⬇ Excel</button>
          </a>
          <button className="btn-primary" onClick={() => setEditLead({ status: 'new', source: 'manual' })}>+ Add Lead</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          style={{ maxWidth: 280 }}
          placeholder="🔍 Search company, contact, email..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
        />
        <select style={{ width: 140 }} value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}>
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select style={{ width: 140 }} value={source} onChange={e => { setSource(e.target.value); setPage(1) }}>
          <option value="">All Sources</option>
          {SOURCE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="btn-secondary" onClick={fetchLeads}>↻</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        {loading ? (
          <div style={{ padding: 24, display: 'flex', gap: 10, alignItems: 'center' }}><span className="spinner" /> Loading...</div>
        ) : leads.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
            No leads found. <a href="/import">Import data</a> or use the <a href="/scraper">Scraper</a>.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: 36 }}><input type="checkbox" className="checkbox" checked={selected.size === leads.length && leads.length > 0} onChange={selectAll} /></th>
                <th>Company</th>
                <th>Contact</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Industry</th>
                <th>Location</th>
                <th>Status</th>
                <th>Source</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.map(lead => (
                <tr key={lead.id}>
                  <td><input type="checkbox" className="checkbox" checked={selected.has(lead.id)} onChange={() => toggleSelect(lead.id)} /></td>
                  <td style={{ fontWeight: 500 }}>{lead.company_name || '—'}</td>
                  <td>{lead.contact_name || '—'}</td>
                  <td>{lead.email ? <a href={`mailto:${lead.email}`}>{lead.email}</a> : '—'}</td>
                  <td>{lead.phone || '—'}</td>
                  <td>{lead.industry || '—'}</td>
                  <td>{lead.location || '—'}</td>
                  <td><Badge value={lead.status} /></td>
                  <td><Badge value={lead.source} /></td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setEditLead(lead)}>Edit</button>
                      <button className="btn-danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => deleteLead(lead.id)}>✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button className="btn-secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Page {page} of {totalPages} ({total} leads)</span>
          <button className="btn-secondary" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next →</button>
        </div>
      )}
    </div>
  )
}
