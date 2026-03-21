import { NavLink } from 'react-router-dom'

const NAV = [
  { to: '/', label: '📊 Dashboard' },
  { to: '/leads', label: '👥 Leads' },
  { to: '/import', label: '📥 Import' },
  { to: '/scraper', label: '🔍 Scraper' },
]

export default function Navbar() {
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
    </nav>
  )
}
