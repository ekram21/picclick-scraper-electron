import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Download, RefreshCw, Send } from 'lucide-react'
import type { AppSettings, UpdateStatus } from '@shared/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

const GITHUB_URL = 'https://github.com/ekram21'
const SUPPORT_EMAIL = 'ekram@edutechs.app'

export function SettingsPage() {
  const queryClient = useQueryClient()
  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: () => window.api.settings.get()
  })

  const versionQuery = useQuery({
    queryKey: ['version'],
    queryFn: () => window.api.app.getVersion()
  })

  const form = useForm<AppSettings>()

  useEffect(() => {
    if (settingsQuery.data) {
      form.reset(settingsQuery.data)
    }
  }, [settingsQuery.data, form])

  const saveMutation = useMutation({
    mutationFn: (values: AppSettings) => window.api.settings.update(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast.success('Settings saved')
    }
  })

  const testMutation = useMutation({
    mutationFn: () => window.api.settings.testDiscord(form.getValues('discordWebhookUrl')),
    onSuccess: () => toast.success('Test message sent to Discord'),
    onError: (err: Error) => toast.error(err.message)
  })

  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({
    checking: false,
    available: false,
    downloaded: false
  })

  useEffect(() => {
    void window.api.app.getUpdateStatus().then(setUpdateStatus)
    return window.api.onUpdateStatus(setUpdateStatus)
  }, [])

  const onSubmit = form.handleSubmit((values) => saveMutation.mutate(values))

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-muted-foreground">Discord webhook, notifications, and app updates.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Discord</CardTitle>
            <CardDescription>
              Add your Discord incoming webhook here. This is stored locally on your machine and is
              required before alerts can be sent.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="discordWebhookUrl">Webhook URL</Label>
              <Input
                id="discordWebhookUrl"
                type="url"
                autoComplete="off"
                placeholder="https://discord.com/api/webhooks/..."
                {...form.register('discordWebhookUrl', { required: true })}
              />
              <p className="text-xs text-muted-foreground">
                Create one in Discord: Server Settings → Integrations → Webhooks → New Webhook
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={testMutation.isPending || !form.watch('discordWebhookUrl')}
                onClick={() => testMutation.mutate()}
              >
                <Send className="h-4 w-4" />
                Send Test Message
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg border border-white/5 px-4 py-3">
                <Label>Include image in embed</Label>
                <Switch
                  checked={form.watch('includeImage')}
                  onCheckedChange={(v) => form.setValue('includeImage', v)}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/5 px-4 py-3">
                <Label>Include Amazon link</Label>
                <Switch
                  checked={form.watch('includeAmazonLink')}
                  onCheckedChange={(v) => form.setValue('includeAmazonLink', v)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Defaults</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Default poll interval (minutes)</Label>
              <Input
                type="number"
                min={1}
                {...form.register('defaultPollIntervalMinutes', { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label>Update channel</Label>
              <Select
                value={form.watch('updateChannel')}
                onValueChange={(v) => form.setValue('updateChannel', v as AppSettings['updateChannel'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stable">Stable</SelectItem>
                  <SelectItem value="beta">Beta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Updates</CardTitle>
            <CardDescription>
              Version {versionQuery.data ?? '…'} — OTA updates work in installed builds via GitHub Releases.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{updateStatus.message ?? 'Ready to check for updates'}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => void window.api.app.checkForUpdates()}
              >
                <RefreshCw className={`h-4 w-4 ${updateStatus.checking ? 'animate-spin' : ''}`} />
                Check for Updates
              </Button>
              {updateStatus.downloaded && (
                <Button type="button" onClick={() => void window.api.app.installUpdate()}>
                  <Download className="h-4 w-4" />
                  Restart & Install
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Separator />

        <div className="flex justify-end">
          <Button type="submit" disabled={saveMutation.isPending}>
            Save Settings
          </Button>
        </div>
      </form>

      <Card className="border-white/5 bg-zinc-950/40">
        <CardContent className="space-y-3 px-6 py-5 text-center text-sm text-muted-foreground">
          <p>
            Built by{' '}
            <span className="font-medium text-zinc-200">Ekram</span>
            {' · '}
            <span className="text-zinc-400">v{versionQuery.data ?? '…'}</span>
          </p>
          <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            <button
              type="button"
              className="text-emerald-400 transition-colors hover:text-emerald-300"
              onClick={() => void window.api.app.openExternal(GITHUB_URL)}
            >
              GitHub
            </button>
            <span className="hidden text-zinc-700 sm:inline">·</span>
            <span>
              Support:{' '}
              <button
                type="button"
                className="text-emerald-400 transition-colors hover:text-emerald-300"
                onClick={() =>
                  void window.api.app.openExternal(`mailto:${SUPPORT_EMAIL}`)
                }
              >
                {SUPPORT_EMAIL}
              </button>
            </span>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
