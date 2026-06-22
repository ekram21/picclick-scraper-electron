import { useQuery } from '@tanstack/react-query'
import { Activity, BellRing, Eye, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatRelativeTime } from '@/lib/utils'

export function DashboardPage() {
  const statsQuery = useQuery({
    queryKey: ['stats'],
    queryFn: () => window.api.app.getStats(),
    refetchInterval: 15_000
  })

  const watchersQuery = useQuery({
    queryKey: ['watchers'],
    queryFn: () => window.api.watchers.list(),
    refetchInterval: 15_000
  })

  const alertsQuery = useQuery({
    queryKey: ['alerts'],
    queryFn: () => window.api.alerts.list(5)
  })

  const stats = statsQuery.data
  const watchers = watchersQuery.data ?? []
  const alerts = alertsQuery.data ?? []

  const statCards = [
    {
      label: 'Total Watchers',
      value: stats?.totalWatchers ?? 0,
      icon: Eye,
      hint: `${stats?.activeWatchers ?? 0} active`
    },
    {
      label: 'Alerts Today',
      value: stats?.alertsToday ?? 0,
      icon: BellRing,
      hint: stats?.lastAlertAt ? `Last ${formatRelativeTime(stats.lastAlertAt)}` : 'No alerts yet'
    },
    {
      label: 'Monitoring',
      value: stats?.activeWatchers ?? 0,
      icon: Activity,
      hint: 'Background polling enabled'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Monitor PicClick searches and get Discord alerts for new matches.
          </p>
        </div>
        <Button asChild>
          <Link to="/watchers/new">
            <Zap className="h-4 w-4" />
            New Watcher
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {statCards.map(({ label, value, icon: Icon, hint }) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription>{label}</CardDescription>
                <Icon className="h-4 w-4 text-emerald-400" />
              </div>
              <CardTitle className="text-3xl">{value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Watchers</CardTitle>
            <CardDescription>Recent monitoring jobs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {watchers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No watchers yet. Create one to start monitoring.</p>
            ) : (
              watchers.slice(0, 6).map((watcher) => (
                <div
                  key={watcher.id}
                  className="flex items-center justify-between rounded-lg border border-white/5 bg-zinc-950/40 px-4 py-3"
                >
                  <div>
                    <div className="font-medium">{watcher.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {watcher.searchQuery} · every {watcher.pollIntervalMinutes}m
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {watcher.lastError ? (
                      <Badge variant="destructive">Error</Badge>
                    ) : (
                      <Badge variant={watcher.enabled ? 'default' : 'secondary'}>
                        {watcher.enabled ? 'Active' : 'Paused'}
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Alerts</CardTitle>
            <CardDescription>Latest Discord notifications sent</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Alerts will appear here after the first match.</p>
            ) : (
              alerts.map((alert) => (
                <button
                  key={alert.id}
                  type="button"
                  className="w-full rounded-lg border border-white/5 bg-zinc-950/40 px-4 py-3 text-left transition hover:border-emerald-500/20"
                  onClick={() => alert.ebayUrl && void window.api.app.openExternal(alert.ebayUrl)}
                >
                  <div className="line-clamp-1 font-medium">{alert.title}</div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{alert.watcherName}</span>
                    <span>·</span>
                    <span>{formatRelativeTime(alert.sentAt)}</span>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
