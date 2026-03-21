const BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  if (res.status === 204) return null
  return res.json()
}

// Leads
export const leadsApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))
    ).toString()
    return request(`/leads${qs ? '?' + qs : ''}`)
  },
  get: (id) => request(`/leads/${id}`),
  create: (data) => request('/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  update: (id, data) => request(`/leads/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  delete: (id) => request(`/leads/${id}`, { method: 'DELETE' }),
  bulkDelete: (ids) => request('/leads', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ids) }),
}

// Import
export const importApi = {
  csv: (file, sourceLabel = 'csv') => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('source_label', sourceLabel)
    return request('/import/csv', { method: 'POST', body: fd })
  },
  excel: (file, sourceLabel = 'excel') => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('source_label', sourceLabel)
    return request('/import/excel', { method: 'POST', body: fd })
  },
  linkedin: (file) => {
    const fd = new FormData()
    fd.append('file', file)
    return request('/import/linkedin', { method: 'POST', body: fd })
  },
}

// Scraping
export const scrapingApi = {
  scrapeUrl: (config) => request('/scrape/url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config) }),
  scrapeBulk: (urls) => request('/scrape/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(urls) }),
  listJobs: () => request('/scrape/jobs'),
  getJob: (id) => request(`/scrape/jobs/${id}`),
}

// Export
export const exportApi = {
  csvUrl: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))
    ).toString()
    return `${BASE}/export/csv${qs ? '?' + qs : ''}`
  },
  excelUrl: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))
    ).toString()
    return `${BASE}/export/excel${qs ? '?' + qs : ''}`
  },
}

// Analytics
export const analyticsApi = {
  get: () => request('/analytics'),
}
