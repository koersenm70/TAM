import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const NAV = [
  { to: '/', label: '📊 Dashboard' },
  { to: '/leads', label: '👥 Leads' },
  { to: '/import', label: '📥 Import' },
  { to: '/scraper', label: '🔍 Scraper' },
]

export default function Navbar() {
  const { user, isAdmin, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav style={{
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      height: 56,
      gap: 8,
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--accent)', marginRight: 24, whiteSpace: 'nowrap' }}>
        🚀 LeadGen
      </span>

      {NAV.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          style={({ isActive }) => ({
            padding: '6px 14px',
            borderRadius: 8,
            color: isActive ? '#fff' : 'var(--text-muted)',
            background: isActive ? 'var(--accent)' : 'transparent',
            fontWeight: isActive ? 600 : 400,
            fontSize: 14,
            transition: 'all 0.15s',
            whiteSpace: 'nowrap',
          })}
        >
          {label}
        </NavLink>
      ))}

      {isAdmin && (
        <NavLink
          to="/admin"
          style={({ isActive }) => ({
            padding: '6px 14px',
            borderRadius: 8,
            color: isActive ? '#fff' : '#a78bfa',
            background: isActive ? '#7c3aed' : 'rgba(124,58,237,0.1)',
            fontWeight: isActive ? 600 : 500,
            fontSize: 14,
            transition: 'all 0.15s',
            whiteSpace: 'nowrap',
          })}
        >
          👑 Admin
        </NavLink>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* User info + logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{user?.full_name || user?.username}</div>
          {user?.is_admin && <div style={{ fontSize: 11, color: '#a78bfa' }}>Administrator</div>}
        </div>
        <button
          onClick={handleLogout}
          style={{
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
            padding: '6px 12px',
            borderRadius: 8,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}
