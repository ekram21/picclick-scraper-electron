import { useQuery } from '@tanstack/react-query'
import { ExternalLink } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatPrice, formatRelativeTime } from '@/lib/utils'

export function AlertsPage() {
  const alertsQuery = useQuery({
    queryKey: ['alerts'],
    queryFn: () => window.api.alerts.list(100),
    refetchInterval: 20_000
  })

  const alerts = alertsQuery.data ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Alerts</h1>
        <p className="mt-1 text-muted-foreground">History of Discord notifications sent by the app.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alert history</CardTitle>
          <CardDescription>{alerts.length} recent alerts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No alerts yet.</p>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex flex-col gap-3 rounded-xl border border-white/5 bg-zinc-950/40 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={alert.discordStatus === 'sent' ? 'default' : 'destructive'}>
                      {alert.discordStatus}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{alert.watcherName}</span>
                    <span className="text-xs text-muted-foreground">· {formatRelativeTime(alert.sentAt)}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 font-medium">{alert.title}</p>
                  <p className="mt-1 text-sm text-emerald-300">{formatPrice(alert.price, alert.currency)}</p>
                </div>
                {alert.ebayUrl && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300"
                    onClick={() => void window.api.app.openExternal(alert.ebayUrl!)}
                  >
                    View on eBay
                    <ExternalLink className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
