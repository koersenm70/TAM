import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Dashboard from './components/Dashboard'
import LeadsTable from './components/LeadsTable'
import ImportWizard from './components/ImportWizard'
import ScraperConfig from './components/ScraperConfig'

export default function App() {
  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/leads" element={<LeadsTable />} />
        <Route path="/import" element={<ImportWizard />} />
        <Route path="/scraper" element={<ScraperConfig />} />
      </Routes>
    </div>
  )
}
