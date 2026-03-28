import { useEffect, useState } from 'react'
import { analyticsApi } from '../api'
import { useProject } from '../contexts/ProjectContext'

const STATUS_COLOR = {
  new: '#0073ea', contacted: '#fdab3d', qualified: '#00c875',
  converted: '#a25ddc', archived: '#9699a6',
}
const SOURCE_COLOR = {
  csv: '#0073ea', excel: '#00c875', linkedin: '#a25ddc',
  web_scrape: '#e2445c', manual: '#fdab3d',
}

function StatCard({ label, value, sub, color }) {
  return (
    <div className="stat-card" style={{ borderTop: `3px solid ${color || 'var(--accent)'}` }}>
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-value" style={{ color: color || 'var(--text)' }}>{value}</div>
      {sub && <div className="stat-card-sub">{sub}</div>}
    </div>
  )
}

function BarChart({ data, colorMap, title }) {
  const total = Object.values(data).reduce((a, b) => a + b, 0)
  if (!total) return null
  return (
    <div className="card">
      <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 14 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {Object.entries(data).sort((a, b) => b[1] - a[1]).map(([key, count]) => (
          <div key={key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 13 }}>
              <span style={{ textTransform: 'capitalize', color: 'var(--text)' }}>{key}</span>
              <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{count} ({Math.round(count / total * 100)}%)</span>
            </div>
            <div style={{ background: 'var(--surface2)', borderRadius: 4, height: 7, overflow: 'hidden' }}>
              <div style={{
                width: `${(count / total) * 100}%`, height: '100%',
                background: colorMap?.[key] || 'var(--accent)',
                borderRadius: 4, transition: 'width 0.4s ease',
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { activeProject } = useProject()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    analyticsApi.get(activeProject?.id ?? null)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [activeProject])

  if (loading) return <div className="page" style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span className="spinner" /> Loading...</div>
  if (error) return <div className="page"><div className="alert alert-error">{error}</div></div>
  if (!data) return null

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          {activeProject && <div className="page-subtitle">Showing data for <strong>{activeProject.name}</strong></div>}
        </div>
        <button className="btn-secondary" onClick={() => window.location.reload()}>Refresh</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard label="Total Leads" value={data.total_leads} color="var(--accent)" />
        <StatCard label="Converted" value={data.leads_by_status.converted || 0} color="var(--purple)" />
        <StatCard label="Qualified" value={data.leads_by_status.qualified || 0} color="var(--green)" />
        <StatCard label="Conversion Rate" value={`${data.conversion_rate}%`} sub="converted / total" color="var(--yellow)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <BarChart data={data.leads_by_status} colorMap={STATUS_COLOR} title="By Status" />
        <BarChart data={data.leads_by_source} colorMap={SOURCE_COLOR} title="By Source" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {Object.keys(data.leads_by_industry).length > 0 && (
          <BarChart data={data.leads_by_industry} title="Top Industries" />
        )}
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 14 }}>Recent Leads</div>
          {data.recent_leads.length === 0
            ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No leads yet — import data or run the scraper.</div>
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {data.recent_leads.map(lead => (
                  <div key={lead.id} style={{ paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{lead.company_name || lead.contact_name || 'Unknown'}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
                      {lead.email && <span>{lead.email} · </span>}
                      {lead.source && <span style={{ textTransform: 'capitalize' }}>{lead.source}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>
    </div>
  )
}
