import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ProjectProvider, useProject } from './contexts/ProjectContext'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import LeadsTable from './components/LeadsTable'
import ImportWizard from './components/ImportWizard'
import ScraperConfig from './components/ScraperConfig'
import Admin from './components/Admin'
import Projects from './components/Projects'

const PROJECT_COLORS = ['#0073ea', '#00c875', '#e2445c', '#fdab3d', '#a25ddc', '#037f4c', '#ff7575', '#579bfc']

function Sidebar() {
  const { user, isAdmin, logout } = useAuth()
  const { projects, activeProject, selectProject, addProject } = useProject()
  const navigate = useNavigate()
  const [showNewProject, setShowNewProject] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(PROJECT_COLORS[0])
  const [creating, setCreating] = useState(false)

  const handleLogout = () => { logout(); navigate('/login') }

  const handleCreateProject = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    try {
      const base = import.meta.env.DEV ? '/api' : ''
      const token = localStorage.getItem('leadgen_token')
      const res = await fetch(`${base}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newName.trim(), color: newColor }),
      })
      if (res.ok) {
        const project = await res.json()
        addProject(project)
        selectProject(project)
        setNewName('')
        setShowNewProject(false)
        navigate('/leads')
      }
    } catch {}
    setCreating(false)
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">&#128640; LeadGen</div>

      <div className="sidebar-section-label">Workspace</div>
      <NavLink to="/" end className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
        <span className="icon">&#9632;</span> Dashboard
      </NavLink>
      <NavLink to="/projects" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
        <span className="icon">&#9670;</span> Projects
      </NavLink>

      <div className="sidebar-section-label" style={{ marginTop: 8 }}>Projects</div>

      <button
        className={'sidebar-project-item' + (!activeProject ? ' active' : '')}
        onClick={() => { selectProject(null); navigate('/leads') }}
      >
        <span className="sidebar-project-dot" style={{ background: '#676879' }} />
        All leads
      </button>

      {projects.map(p => (
        <button
          key={p.id}
          className={'sidebar-project-item' + (activeProject?.id === p.id ? ' active' : '')}
          onClick={() => { selectProject(p); navigate('/leads') }}
        >
          <span className="sidebar-project-dot" style={{ background: p.color }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
        </button>
      ))}

      {showNewProject ? (
        <form onSubmit={handleCreateProject} style={{ padding: '8px 12px', margin: '2px 8px' }}>
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Project name"
            style={{ marginBottom: 6, fontSize: 12, padding: '5px 8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}
          />
          <div style={{ display: 'flex', gap: 4, marginBottom: 6, flexWrap: 'wrap' }}>
            {PROJECT_COLORS.map(c => (
              <button
                key={c} type="button"
                onClick={() => setNewColor(c)}
                style={{ width: 18, height: 18, borderRadius: '50%', background: c, padding: 0, border: newColor === c ? '2px solid #fff' : '2px solid transparent' }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button type="submit" disabled={creating} style={{ flex: 1, background: '#0073ea', color: '#fff', padding: '4px 8px', fontSize: 12, borderRadius: 4 }}>
              {creating ? '...' : 'Create'}
            </button>
            <button type="button" onClick={() => setShowNewProject(false)} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '4px 8px', fontSize: 12, borderRadius: 4 }}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button className="sidebar-link" style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }} onClick={() => setShowNewProject(true)}>
          + New project
        </button>
      )}

      <div className="sidebar-section-label" style={{ marginTop: 8 }}>Tools</div>
      <NavLink to="/import" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
        <span className="icon">&#8659;</span> Import
      </NavLink>
      <NavLink to="/scraper" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
        <span className="icon">&#9740;</span> Scraper
      </NavLink>
      {isAdmin && (
        <NavLink to="/admin" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
          <span className="icon">&#9733;</span> Admin
        </NavLink>
      )}

      <div className="sidebar-footer">
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, padding: '0 4px', marginBottom: 6 }}>
          {user?.full_name || user?.username}
        </div>
        <button className="sidebar-link" style={{ fontSize: 12 }} onClick={handleLogout}>
          Sign out
        </button>
      </div>
    </aside>
  )
}

function Topbar() {
  const { activeProject } = useProject()
  return (
    <div className="topbar">
      <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>LeadGen</span>
      {activeProject && (
        <>
          <span style={{ color: 'var(--text-light)', fontSize: 13 }}>/</span>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: activeProject.color, display: 'inline-block', flexShrink: 0 }} />
          <span className="topbar-title">{activeProject.name}</span>
        </>
      )}
    </div>
  )
}

function ProtectedRoute({ children, adminOnly = false }) {
  const { token, isAdmin } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />
  return children
}

function AppShell() {
  const { token } = useAuth()

  if (!token) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    )
  }

  return (
    <ProjectProvider>
      <div className="app-shell">
        <Sidebar />
        <div className="main-content">
          <Topbar />
          <Routes>
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
            <Route path="/leads" element={<ProtectedRoute><LeadsTable /></ProtectedRoute>} />
            <Route path="/import" element={<ProtectedRoute><ImportWizard /></ProtectedRoute>} />
            <Route path="/scraper" element={<ProtectedRoute><ScraperConfig /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </ProjectProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}
