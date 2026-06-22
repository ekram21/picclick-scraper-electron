import { Routes, Route } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import { WatchersPage } from '@/pages/WatchersPage'
import { WatcherFormPage } from '@/pages/WatcherFormPage'
import { AlertsPage } from '@/pages/AlertsPage'
import { SettingsPage } from '@/pages/SettingsPage'

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/watchers" element={<WatchersPage />} />
        <Route path="/watchers/new" element={<WatcherFormPage />} />
        <Route path="/watchers/:id" element={<WatcherFormPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </AppLayout>
  )
}
