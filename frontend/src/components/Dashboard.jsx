import { useEffect, useState } from 'react'
import { analyticsApi } from '../api'

const STATUS_COLOR = {
  new: '#3b82f6', contacted: '#f59e0b', qualified: '#22c55e',
  converted: '#a78bfa', archived: '#64748b',
}
const SOURCE_COLOR = {
  csv: '#3b82f6', excel: '#22c55e', linkedin: '#818cf8',
  web_scrape: '#f472b6', manual: '#f59e0b',
}

function StatCard({ label, value, sub, color }) {
  return (
    <div className="card" style={{ borderLeft: `3px solid ${color || 'var(--accent)'}` }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 700, color: color || 'var(--text)' }}>{value}</div>
      {sub && <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function BarChart({ data, colorMap, title }) {
  const total = Object.values(data).reduce((a, b) => a + b, 0)
  if (!total) return null
  return (
    <div className="card">
      <div style={{ fontWeight: 600, marginBottom: 16 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {Object.entries(data).sort((a, b) => b[1] - a[1]).map(([key, count]) => (
          <div key={key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
              <span style={{ textTransform: 'capitalize' }}>{key}</span>
              <span style={{ color: 'var(--text-muted)' }}>{count} ({Math.round(count / total * 100)}%)</span>
            </div>
            <div style={{ background: 'var(--surface2)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
              <div style={{
                width: `${(count / total) * 100}%`,
                height: '100%',
                background: colorMap?.[key] || 'var(--accent)',
                borderRadius: 4,
                transition: 'width 0.4s ease',
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    analyticsApi.get()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="page" style={{ display: 'flex', alignItems: 'center', gap: 12 }}><span className="spinner" /> Loading...</div>
  if (error) return <div className="page"><div className="alert alert-error">{error}</div></div>
  if (!data) return null

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <button className="btn-secondary" onClick={() => window.location.reload()}>↻ Refresh</button>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard label="Total Leads" value={data.total_leads} color="var(--accent)" />
        <StatCard label="Converted" value={data.leads_by_status.converted || 0} color="var(--green)" />
        <StatCard label="Qualified" value={data.leads_by_status.qualified || 0} color="#a78bfa" />
        <StatCard label="Conversion Rate" value={`${data.conversion_rate}%`} sub="converted / total" color="var(--yellow)" />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <BarChart data={data.leads_by_status} colorMap={STATUS_COLOR} title="Leads by Status" />
        <BarChart data={data.leads_by_source} colorMap={SOURCE_COLOR} title="Leads by Source" />
      </div>

      {/* Industry & recent leads */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {Object.keys(data.leads_by_industry).length > 0 && (
          <BarChart data={data.leads_by_industry} title="Top Industries" />
        )}
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 16 }}>Recent Leads</div>
          {data.recent_leads.length === 0
            ? <div style={{ color: 'var(--text-muted)' }}>No leads yet. Import data or run the scraper!</div>
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {data.recent_leads.map(lead => (
                  <div key={lead.id} style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 600 }}>{lead.company_name || lead.contact_name || 'Unknown'}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
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
