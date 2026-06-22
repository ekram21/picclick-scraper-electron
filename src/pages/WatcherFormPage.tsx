import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type { CreateWatcherInput, ListingType, SortOption } from '@shared/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, Textarea } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'BestMatch', label: 'Best Match' },
  { value: 'StartTimeNewest', label: 'Newly Listed' },
  { value: 'EndTimeSoonest', label: 'Ending Soon' },
  { value: 'PricePlusShippingLowest', label: 'Price Lowest' },
  { value: 'CurrentPriceHighest', label: 'Price Highest' },
  { value: 'WatchCountDecreaseSort', label: 'Most Watched' }
]

const LISTING_TYPES: { value: ListingType; label: string }[] = [
  { value: 'All', label: 'All Listings' },
  { value: 'Auction', label: 'Auctions' },
  { value: 'AuctionWithoutBids', label: 'Auctions without Bids' },
  { value: 'AuctionWithBids', label: 'Auctions with Bids' },
  { value: 'BuyItNow', label: 'Buy It Now' },
  { value: 'BestOfferOnly', label: 'Accepts Offers' }
]

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: '212', label: 'Sports Trading Cards' },
  { value: '64482', label: 'Sports Mem, Cards & Fan Shop' },
  { value: '1', label: 'Collectibles' },
  { value: '262343', label: 'Sports Stickers, Collections & Albums' }
]

type FormValues = CreateWatcherInput & {
  includeKeywordsText: string
  excludeKeywordsText: string
}

const defaultValues: FormValues = {
  name: '',
  enabled: true,
  searchQuery: '',
  picclickFilters: {
    listingType: 'All',
    freeShipping: false,
    returnsAccepted: false,
    endingWithin24h: false,
    newWithin7Days: false
  },
  appFilters: {},
  sort: 'StartTimeNewest',
  pollIntervalMinutes: 5,
  alertOn: 'new_listings',
  includeKeywordsText: '',
  excludeKeywordsText: ''
}

function splitKeywords(text: string): string[] {
  return text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export function WatcherFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const watcherQuery = useQuery({
    queryKey: ['watcher', id],
    queryFn: () => window.api.watchers.get(id!),
    enabled: isEdit
  })

  const form = useForm<FormValues>({ defaultValues })

  useEffect(() => {
    if (watcherQuery.data) {
      const w = watcherQuery.data
      form.reset({
        name: w.name,
        enabled: w.enabled,
        searchQuery: w.searchQuery,
        picclickFilters: w.picclickFilters,
        appFilters: w.appFilters,
        sort: w.sort,
        pollIntervalMinutes: w.pollIntervalMinutes,
        discordWebhookUrl: w.discordWebhookUrl,
        alertOn: w.alertOn,
        includeKeywordsText: (w.appFilters.includeKeywords ?? []).join(', '),
        excludeKeywordsText: (w.appFilters.excludeKeywords ?? []).join(', ')
      })
    }
  }, [watcherQuery.data, form])

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload: CreateWatcherInput = {
        name: values.name,
        enabled: values.enabled,
        searchQuery: values.searchQuery,
        picclickFilters: values.picclickFilters,
        appFilters: {
          ...values.appFilters,
          includeKeywords: splitKeywords(values.includeKeywordsText),
          excludeKeywords: splitKeywords(values.excludeKeywordsText)
        },
        sort: values.sort,
        pollIntervalMinutes: Number(values.pollIntervalMinutes),
        discordWebhookUrl: values.discordWebhookUrl || undefined,
        alertOn: values.alertOn
      }

      if (isEdit) {
        return window.api.watchers.update(id!, payload)
      }
      return window.api.watchers.create(payload)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['watchers'] })
      toast.success(isEdit ? 'Watcher updated' : 'Watcher created')
      navigate('/watchers')
    },
    onError: (err: Error) => toast.error(err.message)
  })

  const onSubmit = form.handleSubmit((values) => saveMutation.mutate(values))

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{isEdit ? 'Edit Watcher' : 'New Watcher'}</h1>
        <p className="mt-1 text-muted-foreground">Configure PicClick search, filters, and alert behavior.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basics</CardTitle>
            <CardDescription>Name your watcher and set the PicClick search query.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Watcher name</Label>
              <Input id="name" placeholder="Messi Panini under $10" {...form.register('name', { required: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="searchQuery">Search query</Label>
              <Input id="searchQuery" placeholder="messi" {...form.register('searchQuery', { required: true })} />
            </div>
            <div className="space-y-2">
              <Label>Poll interval (minutes)</Label>
              <Input
                type="number"
                min={1}
                max={120}
                {...form.register('pollIntervalMinutes', { valueAsNumber: true })}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-white/5 px-4 py-3">
              <div>
                <Label>Enabled</Label>
                <p className="text-xs text-muted-foreground">Pause monitoring without deleting</p>
              </div>
              <Switch
                checked={form.watch('enabled')}
                onCheckedChange={(checked) => form.setValue('enabled', checked)}
              />
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="picclick">
          <TabsList>
            <TabsTrigger value="picclick">PicClick Filters</TabsTrigger>
            <TabsTrigger value="app">App Filters</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
          </TabsList>

          <TabsContent value="picclick">
            <Card>
              <CardHeader>
                <CardTitle>PicClick filters</CardTitle>
                <CardDescription>These map directly to PicClick URL parameters.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Sort</Label>
                  <Select
                    value={form.watch('sort')}
                    onValueChange={(v) => form.setValue('sort', v as SortOption)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SORT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Listing type</Label>
                  <Select
                    value={form.watch('picclickFilters.listingType') ?? 'All'}
                    onValueChange={(v) =>
                      form.setValue('picclickFilters.listingType', v as ListingType)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LISTING_TYPES.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={form.watch('picclickFilters.categoryId') ?? 'all'}
                    onValueChange={(v) =>
                      form.setValue('picclickFilters.categoryId', v === 'all' ? undefined : v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((opt) => (
                        <SelectItem key={opt.value || 'all'} value={opt.value || 'all'}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>PicClick max price</Label>
                  <Input
                    type="number"
                    placeholder="Optional"
                    onChange={(e) =>
                      form.setValue(
                        'picclickFilters.maxPrice',
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                    defaultValue={form.watch('picclickFilters.maxPrice')}
                  />
                </div>

                <div className="md:col-span-2 grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      ['freeShipping', 'Free shipping'],
                      ['returnsAccepted', 'Returns accepted'],
                      ['endingWithin24h', 'Ending within 24h'],
                      ['newWithin7Days', 'New within 7 days']
                    ] as const
                  ).map(([key, label]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between rounded-lg border border-white/5 px-4 py-3"
                    >
                      <Label>{label}</Label>
                      <Switch
                        checked={Boolean(form.watch(`picclickFilters.${key}`))}
                        onCheckedChange={(checked) =>
                          form.setValue(`picclickFilters.${key}`, checked, { shouldDirty: true })
                        }
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="app">
            <Card>
              <CardHeader>
                <CardTitle>App-level filters</CardTitle>
                <CardDescription>Applied after scraping for precise card matching.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label>Title must contain (comma-separated)</Label>
                  <Textarea
                    placeholder="panini, instant, #46"
                    {...form.register('includeKeywordsText')}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Title must not contain</Label>
                  <Textarea
                    placeholder="signed, jersey, repack"
                    {...form.register('excludeKeywordsText')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Min price ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    onChange={(e) =>
                      form.setValue(
                        'appFilters.minPrice',
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max price ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    onChange={(e) =>
                      form.setValue(
                        'appFilters.maxPrice',
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Min watchers</Label>
                  <Input
                    type="number"
                    onChange={(e) =>
                      form.setValue(
                        'appFilters.minWatchers',
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts">
            <Card>
              <CardHeader>
                <CardTitle>Discord alerts</CardTitle>
                <CardDescription>Override the global webhook for this watcher if needed.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Webhook override (optional)</Label>
                  <Input
                    placeholder="Uses global webhook if empty"
                    {...form.register('discordWebhookUrl')}
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>Alert mode</Label>
                  <Select
                    value={form.watch('alertOn')}
                    onValueChange={(v) => form.setValue('alertOn', v as FormValues['alertOn'])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new_listings">New listings only</SelectItem>
                      <SelectItem value="all_matches">All matches every poll</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/watchers')}>
            Cancel
          </Button>
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Watcher'}
          </Button>
        </div>
      </form>
    </div>
  )
}
