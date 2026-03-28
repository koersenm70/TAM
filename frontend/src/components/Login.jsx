import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!username.trim() || !password) { setError('Please enter username and password.'); return }
    setLoading(true)
    try {
      await login(username.trim(), password)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'var(--bg)',
    }}>
      {/* Left panel */}
      <div style={{
        width: 420,
        background: 'var(--sidebar-bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 48,
        color: '#fff',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>&#128640;</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>LeadGen</h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: 1.6 }}>
          Market Research &amp; Lead Generation platform. Find, import, and manage your sales pipeline.
        </p>
        <div style={{ marginTop: 48, display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
          {['Import CSV, Excel & LinkedIn', 'Web scraping & lead discovery', 'Project-based organisation', 'Export & CRM-ready data'].map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
              <span style={{ color: 'var(--green)', fontWeight: 700 }}>&#10003;</span> {f}
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Sign in</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 28, fontSize: 14 }}>Welcome back — enter your credentials to continue.</p>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Username</label>
              <input
                autoFocus
                autoComplete="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter your username"
                disabled={loading}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Password</label>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ marginTop: 4, padding: '11px', fontSize: 14 }}
            >
              {loading ? <span className="spinner" /> : 'Sign In'}
            </button>
          </form>

          <p style={{ color: 'var(--text-light)', marginTop: 24, fontSize: 12, textAlign: 'center' }}>
            Forgot your password? Contact your administrator.
          </p>
        </div>
      </div>
    </div>
  )
}
