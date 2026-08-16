import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import HomePage from './pages/HomePage'
import TreesPage from './pages/TreesPage'
import TreePage from './pages/TreePage'
import NodeDetailPage from './pages/NodeDetailPage'
import DatabasePage from './pages/DatabasePage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/trees" element={<TreesPage />} />
        <Route path="/tree/:id" element={<TreePage />} />
        <Route path="/node/:id" element={<NodeDetailPage />} />
        <Route path="/database" element={<DatabasePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
