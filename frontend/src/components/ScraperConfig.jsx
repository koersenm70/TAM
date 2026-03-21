import { useState, useEffect, useCallback } from 'react'
import { scrapingApi } from '../api'

const JOB_STATUS_COLOR = { pending: '#f59e0b', running: '#3b82f6', completed: '#22c55e', failed: '#ef4444' }

function JobRow({ job, onRefresh }) {
  return (
    <tr>
      <td style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        <a href={job.url} target="_blank" rel="noreferrer" title={job.url}>{job.url}</a>
      </td>
      <td>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600,
          color: JOB_STATUS_COLOR[job.status] || '#fff',
        }}>
          {job.status === 'running' && <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />}
          {job.status.toUpperCase()}
        </span>
      </td>
      <td>{job.leads_found || 0}</td>
      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        {job.error ? <span style={{ color: 'var(--red)' }}>{job.error.slice(0, 60)}</span> : '—'}
      </td>
      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        {job.created_at ? new Date(job.created_at).toLocaleString() : '—'}
      </td>
    </tr>
  )
}

export default function ScraperConfig() {
  const [url, setUrl] = useState('')
  const [bulkUrls, setBulkUrls] = useState('')
  const [mode, setMode] = useState('single')
  const [config, setConfig] = useState({
    extract_emails: true,
    extract_phones: true,
    extract_company_name: true,
    follow_links: false,
    max_pages: 3,
  })
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const fetchJobs = useCallback(async () => {
    try {
      const data = await scrapingApi.listJobs()
      setJobs(data)
    } catch {}
  }, [])

  useEffect(() => {
    fetchJobs()
    const interval = setInterval(fetchJobs, 3000)
    return () => clearInterval(interval)
  }, [fetchJobs])

  const handleScrape = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      if (mode === 'single') {
        const trimmed = url.trim()
        if (!trimmed) throw new Error('Please enter a URL')
        await scrapingApi.scrapeUrl({ ...config, url: trimmed })
        setSuccess('Scraping job started! Check the jobs table below.')
        setUrl('')
      } else {
        const urls = bulkUrls.split('\n').map(u => u.trim()).filter(Boolean)
        if (urls.length === 0) throw new Error('Please enter at least one URL')
        await scrapingApi.scrapeBulk(urls)
        setSuccess(`${urls.length} scraping jobs started!`)
        setBulkUrls('')
      }
      fetchJobs()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const running = jobs.filter(j => ['pending', 'running'].includes(j.status)).length
  const totalLeads = jobs.reduce((a, j) => a + (j.leads_found || 0), 0)

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Web Scraper</h1>
        <div className="flex gap-2 items-center">
          {running > 0 && (
            <span style={{ color: 'var(--yellow)', fontSize: 13 }}>
              <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2, marginRight: 6 }} />
              {running} job{running > 1 ? 's' : ''} running
            </span>
          )}
          <button className="btn-secondary" onClick={fetchJobs}>↻ Refresh</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ borderLeft: '3px solid var(--accent)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Total Jobs</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{jobs.length}</div>
        </div>
        <div className="card" style={{ borderLeft: '3px solid var(--green)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Leads Found</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{totalLeads}</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 16 }}>Configure & Run Scraper</div>

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button
            onClick={() => setMode('single')}
            style={{ padding: '6px 16px', borderRadius: 8, background: mode === 'single' ? 'var(--accent)' : 'var(--surface2)', color: mode === 'single' ? '#fff' : 'var(--text-muted)', border: '1px solid var(--border)' }}
          >Single URL</button>
          <button
            onClick={() => setMode('bulk')}
            style={{ padding: '6px 16px', borderRadius: 8, background: mode === 'bulk' ? 'var(--accent)' : 'var(--surface2)', color: mode === 'bulk' ? '#fff' : 'var(--text-muted)', border: '1px solid var(--border)' }}
          >Bulk URLs</button>
        </div>

        {mode === 'single' ? (
          <div className="form-group">
            <label>Website URL</label>
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://example.com"
              onKeyDown={e => e.key === 'Enter' && handleScrape()}
            />
          </div>
        ) : (
          <div className="form-group">
            <label>URLs (one per line)</label>
            <textarea
              value={bulkUrls}
              onChange={e => setBulkUrls(e.target.value)}
              placeholder={'https://example.com\nhttps://company.io\nhttps://startup.com'}
              style={{ minHeight: 120 }}
            />
          </div>
        )}

        {/* Config checkboxes */}
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 16 }}>
          {[
            ['extract_emails', '📧 Extract Emails'],
            ['extract_phones', '📞 Extract Phones'],
            ['extract_company_name', '🏢 Extract Company Name'],
            ['follow_links', '🔗 Follow Internal Links'],
          ].map(([key, label]) => (
            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                className="checkbox"
                checked={config[key]}
                onChange={e => setConfig(c => ({ ...c, [key]: e.target.checked }))}
              />
              <span style={{ fontSize: 13 }}>{label}</span>
            </label>
          ))}
        </div>

        {config.follow_links && (
          <div className="form-group" style={{ maxWidth: 200 }}>
            <label>Max Pages to Crawl</label>
            <input
              type="number"
              min={1}
              max={20}
              value={config.max_pages}
              onChange={e => setConfig(c => ({ ...c, max_pages: parseInt(e.target.value) || 1 }))}
            />
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">✅ {success}</div>}

        <button className="btn-primary" onClick={handleScrape} disabled={loading} style={{ minWidth: 160 }}>
          {loading ? <span className="spinner" /> : '🔍 Start Scraping'}
        </button>
      </div>

      {/* Tips */}
      <div className="alert alert-info" style={{ marginBottom: 24 }}>
        <strong>Tips for best results:</strong> Scrape company "Contact" or "About" pages for emails. Try business directories like local chamber of commerce sites, industry directories, or startup databases.
        Enable "Follow Internal Links" to crawl an entire domain.
      </div>

      {/* Jobs table */}
      {jobs.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'auto' }}>
          <div style={{ padding: '16px 20px', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>
            Scraping Jobs
          </div>
          <table>
            <thead>
              <tr>
                <th>URL</th>
                <th>Status</th>
                <th>Leads Found</th>
                <th>Error</th>
                <th>Started</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(job => <JobRow key={job.id} job={job} onRefresh={fetchJobs} />)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
