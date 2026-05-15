import { Routes, Route, Navigate } from 'react-router-dom'
import AppProviders from './AppProviders'
import HomePage from './pages/HomePage'
import TreePage from './pages/TreePage'
import DatabasePage from './pages/DatabasePage'
import MyTreesPage from './pages/MyTreesPage'
import SettingsPage from './pages/SettingsPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/my-trees" element={<MyTreesPage />} />
      <Route path="/tree/:id" element={<TreePage />} />
      <Route path="/database" element={<DatabasePage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function RootApp() {
  return (
    <AppProviders>
      <App />
    </AppProviders>
  )
}
