import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Edit, Play, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatRelativeTime } from '@/lib/utils'

export function WatchersPage() {
  const queryClient = useQueryClient()
  const watchersQuery = useQuery({
    queryKey: ['watchers'],
    queryFn: () => window.api.watchers.list()
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => window.api.watchers.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['watchers'] })
      toast.success('Watcher deleted')
    }
  })

  const runMutation = useMutation({
    mutationFn: (id: string) => window.api.watchers.runNow(id, false),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['watchers'] })
      toast.success(`Found ${result.matched.length} matches (${result.newMatches.length} new)`)
    },
    onError: (err: Error) => toast.error(err.message)
  })

  const watchers = watchersQuery.data ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Watchers</h1>
          <p className="mt-1 text-muted-foreground">Manage PicClick search monitors and filters.</p>
        </div>
        <Button asChild>
          <Link to="/watchers/new">
            <Plus className="h-4 w-4" />
            Add Watcher
          </Link>
        </Button>
      </div>

      {watchers.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No watchers yet</CardTitle>
            <CardDescription>Create your first watcher to start monitoring PicClick listings.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/watchers/new">Create Watcher</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {watchers.map((watcher) => (
            <Card key={watcher.id}>
              <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold">{watcher.name}</h3>
                    <Badge variant={watcher.enabled ? 'default' : 'secondary'}>
                      {watcher.enabled ? 'Active' : 'Paused'}
                    </Badge>
                    {watcher.lastError && <Badge variant="destructive">Error</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Query: <span className="text-foreground">{watcher.searchQuery}</span> · every{' '}
                    {watcher.pollIntervalMinutes} min · last checked{' '}
                    {formatRelativeTime(watcher.lastCheckedAt)}
                  </p>
                  {watcher.lastError && (
                    <p className="text-xs text-red-400">{watcher.lastError}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={runMutation.isPending}
                    onClick={() => runMutation.mutate(watcher.id)}
                  >
                    <Play className="h-4 w-4" />
                    Test Run
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/watchers/${watcher.id}`}>
                      <Edit className="h-4 w-4" />
                      Edit
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm('Delete this watcher?')) deleteMutation.mutate(watcher.id)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
