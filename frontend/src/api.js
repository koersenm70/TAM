const BASE = '/api'

function getToken() {
  return localStorage.getItem('leadgen_token')
}

async function request(path, options = {}) {
  const token = getToken()
  const headers = { ...(options.headers || {}) }
  if (token) headers['Authorization'] = `Bearer ${token}`
  // Don't set Content-Type for FormData (browser sets it with boundary)
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json'
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers })

  if (res.status === 401) {
    localStorage.removeItem('leadgen_token')
    localStorage.removeItem('leadgen_user')
    window.location.href = '/'
    return
  }

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
  create: (data) => request('/leads', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/leads/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/leads/${id}`, { method: 'DELETE' }),
  bulkDelete: (ids) => request('/leads', { method: 'DELETE', body: JSON.stringify(ids) }),
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
  scrapeUrl: (config) => request('/scrape/url', { method: 'POST', body: JSON.stringify(config) }),
  scrapeBulk: (urls) => request('/scrape/bulk', { method: 'POST', body: JSON.stringify(urls) }),
  listJobs: () => request('/scrape/jobs'),
  getJob: (id) => request(`/scrape/jobs/${id}`),
}

// Export — these are direct download links, so we build URLs with the token
export const exportApi = {
  csvUrl: (params = {}) => {
    const token = getToken()
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries({ ...params, token }).filter(([, v]) => v != null && v !== ''))
    ).toString()
    return `${BASE}/export/csv${qs ? '?' + qs : ''}`
  },
  excelUrl: (params = {}) => {
    const token = getToken()
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries({ ...params, token }).filter(([, v]) => v != null && v !== ''))
    ).toString()
    return `${BASE}/export/excel${qs ? '?' + qs : ''}`
  },
}

// Analytics
export const analyticsApi = {
  get: () => request('/analytics'),
}
