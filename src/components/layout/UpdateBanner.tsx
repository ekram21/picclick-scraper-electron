import { useEffect, useState } from 'react'
import { Download, RefreshCw } from 'lucide-react'
import type { UpdateStatus } from '@shared/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function UpdateBanner() {
  const [status, setStatus] = useState<UpdateStatus>({
    checking: false,
    available: false,
    downloaded: false
  })

  useEffect(() => {
    void window.api.app.getUpdateStatus().then(setStatus)
    return window.api.onUpdateStatus(setStatus)
  }, [])

  if (!status.available && !status.downloaded && !status.message?.includes('Updates apply')) {
    return null
  }

  return (
    <div className="flex items-center justify-between gap-4 border-b border-emerald-500/20 bg-emerald-500/10 px-6 py-3">
      <div className="flex items-center gap-3 text-sm">
        {status.downloaded ? (
          <Badge>Update ready</Badge>
        ) : (
          <RefreshCw className={`h-4 w-4 text-emerald-400 ${status.checking ? 'animate-spin' : ''}`} />
        )}
        <span>{status.message}</span>
      </div>
      {status.downloaded && (
        <Button size="sm" onClick={() => void window.api.app.installUpdate()}>
          <Download className="h-4 w-4" />
          Restart & Install
        </Button>
      )}
    </div>
  )
}
