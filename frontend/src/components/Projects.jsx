import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProject } from '../contexts/ProjectContext'
import { projectsApi } from '../api'

const COLORS = ['#0073ea', '#00c875', '#e2445c', '#fdab3d', '#a25ddc', '#037f4c', '#ff7575', '#579bfc', '#ff642e', '#00d0b0']

function ColorPicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
      {COLORS.map(c => (
        <button
          key={c} type="button"
          onClick={() => onChange(c)}
          style={{
            width: 24, height: 24, borderRadius: '50%', background: c, padding: 0,
            border: value === c ? '3px solid #323338' : '2px solid transparent',
            outline: value === c ? '2px solid ' + c : 'none',
            outlineOffset: 2,
          }}
        />
      ))}
    </div>
  )
}

function ProjectCard({ project, onSelect, onEdit, onDelete }) {
  return (
    <div className="card" style={{ cursor: 'pointer', transition: 'box-shadow 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: project.color, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{project.name}</div>
          {project.description && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {project.description}
            </div>
          )}
          <div style={{ fontSize: 11, color: 'var(--text-light)' }}>
            Created {new Date(project.created_at).toLocaleDateString()}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button className="btn-primary btn-sm" style={{ flex: 1 }} onClick={() => onSelect(project)}>
          Open project
        </button>
        <button className="btn-secondary btn-sm" onClick={() => onEdit(project)}>Edit</button>
        <button className="btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => onDelete(project)}>Delete</button>
      </div>
    </div>
  )
}

function ProjectModal({ project, onClose, onSave }) {
  const [name, setName] = useState(project?.name || '')
  const [description, setDescription] = useState(project?.description || '')
  const [color, setColor] = useState(project?.color || COLORS[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError(null)
    try {
      const data = { name: name.trim(), description: description.trim() || null, color }
      const result = project
        ? await projectsApi.update(project.id, data)
        : await projectsApi.create(data)
      onSave(result)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="card" style={{ width: '100%', maxWidth: 440, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 20 }}>{project ? 'Edit project' : 'New project'}</h2>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Project name</label>
            <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Q2 EU Expansion" />
          </div>
          <div className="form-group">
            <label>Description (optional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this project about?" rows={2} />
          </div>
          <div className="form-group">
            <label>Color</label>
            <ColorPicker value={color} onChange={setColor} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <span className="spinner" /> : project ? 'Save changes' : 'Create project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Projects() {
  const { projects, activeProject, selectProject, addProject, updateProject, removeProject } = useProject()
  const navigate = useNavigate()
  const [modal, setModal] = useState(null) // null | 'new' | project object
  const [deleting, setDeleting] = useState(null)
  const [error, setError] = useState(null)

  const handleSelect = (project) => {
    selectProject(project)
    navigate('/leads')
  }

  const handleSave = (result) => {
    if (modal && modal !== 'new') updateProject(result)
    else addProject(result)
    setModal(null)
  }

  const handleDelete = async (project) => {
    if (!window.confirm(`Delete project "${project.name}"? Leads won't be deleted.`)) return
    setDeleting(project.id)
    try {
      await projectsApi.delete(project.id)
      removeProject(project.id)
    } catch (err) {
      setError(err.message)
    }
    setDeleting(null)
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <div className="page-subtitle">Organise your lead generation campaigns</div>
        </div>
        <button className="btn-primary" onClick={() => setModal('new')}>+ New project</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {projects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">&#9670;</div>
          <div className="empty-state-title">No projects yet</div>
          <div style={{ marginBottom: 20 }}>Create your first project to organise your leads</div>
          <button className="btn-primary" onClick={() => setModal('new')}>Create project</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {projects.map(p => (
            <ProjectCard
              key={p.id}
              project={p}
              onSelect={handleSelect}
              onEdit={() => setModal(p)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {modal && (
        <ProjectModal
          project={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
