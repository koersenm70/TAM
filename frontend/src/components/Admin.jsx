import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'

function apiHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

async function apiFetch(url, options, token) {
  const res = await fetch(`/api${url}`, { ...options, headers: { ...apiHeaders(token), ...options?.headers } })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Request failed')
  }
  if (res.status === 204) return null
  return res.json()
}

function UserModal({ user, onClose, onSave, token }) {
  const isNew = !user.id
  const [form, setForm] = useState({
    username: user.username || '',
    full_name: user.full_name || '',
    email: user.email || '',
    password: '',
    is_admin: user.is_admin || false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (isNew && !form.password) { setError('Password is required for new users.'); return }
    if (form.password && form.password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setSaving(true)
    setError(null)
    try {
      if (isNew) {
        await apiFetch('/admin/users', { method: 'POST', body: JSON.stringify(form) }, token)
      } else {
        const { password, username, ...updateData } = form
        await apiFetch(`/admin/users/${user.id}`, { method: 'PUT', body: JSON.stringify(updateData) }, token)
      }
      onSave()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
      <div className="card" style={{ width: 460, padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700 }}>{isNew ? 'Add New User' : `Edit: ${user.username}`}</h2>
          <button className="btn-secondary" onClick={onClose} style={{ padding: '4px 10px' }}>✕</button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Username {!isNew && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(cannot change)</span>}</label>
            <input value={form.username} onChange={e => set('username', e.target.value)} disabled={!isNew} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Full Name</label>
            <input value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Optional" />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Email</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="Optional" />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>{isNew ? 'Password' : 'New Password'} {!isNew && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(leave blank to keep current)</span>}</label>
            <input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder={isNew ? 'Min 6 characters' : 'Leave blank to keep unchanged'} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none', padding: '10px 12px', background: 'var(--surface2)', borderRadius: 'var(--radius)' }}>
            <input type="checkbox" className="checkbox" checked={form.is_admin} onChange={e => set('is_admin', e.target.checked)} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>Administrator</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Can manage users and access all features</div>
            </div>
          </label>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <span className="spinner" /> : (isNew ? 'Create User' : 'Save Changes')}
          </button>
        </div>
      </div>
    </div>
  )
}

function ResetPasswordModal({ user, onClose, token }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)

  const handleReset = async () => {
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setSaving(true)
    setError(null)
    try {
      await apiFetch(`/admin/users/${user.id}/reset-password`, { method: 'POST', body: JSON.stringify({ new_password: password }) }, token)
      setSuccess(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
      <div className="card" style={{ width: 400, padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700 }}>Reset Password</h2>
          <button className="btn-secondary" onClick={onClose} style={{ padding: '4px 10px' }}>✕</button>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
          Set a new password for <strong>{user.username}</strong>.
        </p>

        {success
          ? <div className="alert alert-success">✅ Password reset successfully!</div>
          : (
            <>
              {error && <div className="alert alert-error">{error}</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>New Password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" autoFocus />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Confirm Password</label>
                  <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat new password" />
                </div>
              </div>
            </>
          )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="btn-secondary" onClick={onClose}>{success ? 'Close' : 'Cancel'}</button>
          {!success && (
            <button className="btn-primary" onClick={handleReset} disabled={saving}>
              {saving ? <span className="spinner" /> : '🔑 Reset Password'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Admin() {
  const { token, user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modal, setModal] = useState(null)   // { type: 'edit'|'reset', user }

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiFetch('/admin/users', {}, token)
      setUsers(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const deleteUser = async (u) => {
    if (!window.confirm(`Delete user "${u.username}"? This cannot be undone.`)) return
    try {
      await apiFetch(`/admin/users/${u.id}`, { method: 'DELETE' }, token)
      fetchUsers()
    } catch (e) { alert(e.message) }
  }

  const toggleActive = async (u) => {
    try {
      await apiFetch(`/admin/users/${u.id}`, { method: 'PUT', body: JSON.stringify({ is_active: !u.is_active }) }, token)
      fetchUsers()
    } catch (e) { alert(e.message) }
  }

  return (
    <div className="page">
      {modal?.type === 'edit' && (
        <UserModal user={modal.user} token={token} onClose={() => setModal(null)} onSave={() => { setModal(null); fetchUsers() }} />
      )}
      {modal?.type === 'reset' && (
        <ResetPasswordModal user={modal.user} token={token} onClose={() => { setModal(null); fetchUsers() }} />
      )}

      <div className="page-header">
        <h1 className="page-title">Admin Panel — User Management</h1>
        <button className="btn-primary" onClick={() => setModal({ type: 'edit', user: {} })}>+ Add User</button>
      </div>

      <div className="alert alert-info" style={{ marginBottom: 20 }}>
        <strong>Tip:</strong> Make sure to change the default <code>admin</code> password after first login!
        You are logged in as <strong>{currentUser?.username}</strong>.
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        {loading ? (
          <div style={{ padding: 24, display: 'flex', gap: 10, alignItems: 'center' }}><span className="spinner" /> Loading users...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Full Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>
                    {u.username}
                    {u.id === currentUser?.id && <span style={{ color: 'var(--accent)', fontSize: 11, marginLeft: 6 }}>(you)</span>}
                  </td>
                  <td>{u.full_name || '—'}</td>
                  <td>{u.email || '—'}</td>
                  <td>
                    <span className={`badge ${u.is_admin ? 'badge-converted' : 'badge-new'}`}>
                      {u.is_admin ? '👑 Admin' : '👤 User'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${u.is_active ? 'badge-qualified' : 'badge-archived'}`}>
                      {u.is_active ? '● Active' : '○ Disabled'}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setModal({ type: 'edit', user: u })}>
                        ✏️ Edit
                      </button>
                      <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setModal({ type: 'reset', user: u })}>
                        🔑 Password
                      </button>
                      <button
                        className="btn-secondary"
                        style={{ padding: '4px 10px', fontSize: 12, color: u.is_active ? 'var(--yellow)' : 'var(--green)' }}
                        onClick={() => toggleActive(u)}
                        disabled={u.id === currentUser?.id}
                        title={u.id === currentUser?.id ? "Can't disable your own account" : ''}
                      >
                        {u.is_active ? '⏸ Disable' : '▶ Enable'}
                      </button>
                      <button
                        className="btn-danger"
                        style={{ padding: '4px 10px', fontSize: 12 }}
                        onClick={() => deleteUser(u)}
                        disabled={u.id === currentUser?.id}
                        title={u.id === currentUser?.id ? "Can't delete your own account" : ''}
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
