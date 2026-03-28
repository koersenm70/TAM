import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const ProjectContext = createContext(null)

export function ProjectProvider({ children }) {
  const [projects, setProjects] = useState([])
  const [activeProject, setActiveProject] = useState(null)
  const [loading, setLoading] = useState(true)

  const base = import.meta.env.DEV ? '/api' : ''

  const fetchProjects = useCallback(async () => {
    const token = localStorage.getItem('leadgen_token')
    if (!token) { setLoading(false); return }
    try {
      const res = await fetch(`${base}/projects`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        setProjects(data)
        // Restore last active project from localStorage
        const savedId = localStorage.getItem('activeProjectId')
        if (savedId) {
          const found = data.find(p => p.id === parseInt(savedId))
          if (found) setActiveProject(found)
        }
      }
    } catch {}
    setLoading(false)
  }, [base])

  useEffect(() => { fetchProjects() }, [fetchProjects])

  const selectProject = (project) => {
    setActiveProject(project)
    if (project) localStorage.setItem('activeProjectId', project.id)
    else localStorage.removeItem('activeProjectId')
  }

  const addProject = (project) => {
    setProjects(prev => [project, ...prev])
  }

  const updateProject = (updated) => {
    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p))
    if (activeProject?.id === updated.id) setActiveProject(updated)
  }

  const removeProject = (id) => {
    setProjects(prev => prev.filter(p => p.id !== id))
    if (activeProject?.id === id) { setActiveProject(null); localStorage.removeItem('activeProjectId') }
  }

  return (
    <ProjectContext.Provider value={{ projects, activeProject, loading, selectProject, addProject, updateProject, removeProject, fetchProjects }}>
      {children}
    </ProjectContext.Provider>
  )
}

export function useProject() {
  return useContext(ProjectContext)
}
