import { useState, useRef } from 'react'
import { importApi } from '../api'

const TABS = [
  { id: 'csv', label: '📄 CSV File', desc: 'Import any CSV with company/contact data' },
  { id: 'excel', label: '📊 Excel File', desc: 'Import .xlsx or .xls spreadsheets' },
  { id: 'linkedin', label: '🔗 LinkedIn Export', desc: 'Import LinkedIn connections or Sales Navigator CSV export' },
]

function DropZone({ accept, onFile }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef()

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }

  return (
    <div
      onClick={() => inputRef.current.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      style={{
        border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 'var(--radius)',
        padding: '40px 24px',
        textAlign: 'center',
        cursor: 'pointer',
        background: dragging ? 'rgba(108,99,255,0.05)' : 'transparent',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ fontSize: 36, marginBottom: 8 }}>⬆</div>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>Drop file here or click to browse</div>
      <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{accept}</div>
      <input ref={inputRef} type="file" accept={accept} style={{ display: 'none' }} onChange={e => e.target.files[0] && onFile(e.target.files[0])} />
    </div>
  )
}

function LinkedInTip() {
  return (
    <div className="alert alert-info" style={{ marginBottom: 16 }}>
      <strong>How to export from LinkedIn:</strong>
      <ol style={{ marginTop: 8, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <li>Go to LinkedIn Settings → Data Privacy → Get a copy of your data</li>
        <li>Select "Connections" and request the archive</li>
        <li>Download and upload the <code>Connections.csv</code> file here</li>
        <li>For Sales Navigator: Export leads directly as CSV from your lead lists</li>
      </ol>
    </div>
  )
}

export default function ImportWizard() {
  const [tab, setTab] = useState('csv')
  const [file, setFile] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleFile = (f) => {
    setFile(f)
    setResult(null)
    setError(null)
  }

  const handleImport = async () => {
    if (!file) return
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      let res
      if (tab === 'csv') res = await importApi.csv(file)
      else if (tab === 'excel') res = await importApi.excel(file)
      else res = await importApi.linkedin(file)
      setResult(res)
      setFile(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const currentTab = TABS.find(t => t.id === tab)

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Import Leads</h1>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setFile(null); setResult(null); setError(null) }}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius)',
              background: tab === t.id ? 'var(--accent)' : 'var(--surface)',
              color: tab === t.id ? '#fff' : 'var(--text-muted)',
              border: '1px solid var(--border)',
              fontWeight: tab === t.id ? 600 : 400,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card" style={{ maxWidth: 640 }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>{currentTab.desc}</p>

        {tab === 'linkedin' && <LinkedInTip />}

        {result && (
          <div className="alert alert-success">
            ✅ Successfully imported <strong>{result.imported}</strong> leads from {result.total_rows} rows.
            {' '}<a href="/leads">View all leads →</a>
          </div>
        )}
        {error && <div className="alert alert-error">❌ {error}</div>}

        <DropZone
          accept={tab === 'excel' ? '.xlsx,.xls' : '.csv'}
          onFile={handleFile}
        />

        {file && (
          <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--surface2)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>{tab === 'excel' ? '📊' : '📄'}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500 }}>{file.name}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{(file.size / 1024).toFixed(1)} KB</div>
            </div>
            <button className="btn-secondary" style={{ padding: '4px 10px' }} onClick={() => setFile(null)}>✕</button>
          </div>
        )}

        <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
          <button
            className="btn-primary"
            onClick={handleImport}
            disabled={!file || loading}
            style={{ minWidth: 140 }}
          >
            {loading ? <span className="spinner" /> : '⬆ Import'}
          </button>
          {result && (
            <a href="/leads"><button className="btn-success">👥 View Leads</button></a>
          )}
        </div>
      </div>

      {/* Column mapping guide */}
      <div className="card" style={{ maxWidth: 640, marginTop: 24 }}>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Supported Column Names</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.8 }}>
          The importer auto-detects these column headers (case-insensitive):
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px', marginTop: 8 }}>
            {[
              ['Company / Organization / Account Name', '→ company_name'],
              ['Name / Full Name / Contact Name', '→ contact_name'],
              ['First Name + Last Name', '→ combined contact_name'],
              ['Email / Email Address', '→ email'],
              ['Phone / Mobile / Telephone', '→ phone'],
              ['Website / URL', '→ website'],
              ['Industry / Sector / Vertical', '→ industry'],
              ['Company Size / Employees', '→ company_size'],
              ['Location / City / Country', '→ location'],
              ['LinkedIn / LinkedIn URL', '→ linkedin_url'],
              ['Notes / Comments / Description', '→ notes'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'contents' }}>
                <span style={{ color: 'var(--text)' }}>{k}</span>
                <span style={{ color: 'var(--accent)' }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 8 }}>Any other columns will be saved as custom fields.</div>
        </div>
      </div>
    </div>
  )
}
