import { Radar } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

const TITLEBAR_HEIGHT = 48

function AppBrand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 ring-1 ring-emerald-500/25">
        <Radar className="h-3.5 w-3.5 text-emerald-400" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold tracking-tight text-zinc-100">
          PicClick Watcher
        </p>
        {!compact && (
          <p className="truncate text-[11px] leading-tight text-zinc-500">Listing alerts</p>
        )}
      </div>
    </div>
  )
}

function WindowsControls({
  maximized,
  onMinimize,
  onMaximize,
  onClose
}: {
  maximized: boolean
  onMinimize: () => void
  onMaximize: () => void
  onClose: () => void
}) {
  return (
    <div className="app-no-drag flex h-full shrink-0">
      <button
        type="button"
        aria-label="Minimize"
        onClick={onMinimize}
        className="inline-flex h-full w-[46px] items-center justify-center text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-100"
      >
        <svg width="10" height="1" viewBox="0 0 10 1" aria-hidden="true">
          <rect width="10" height="1" fill="currentColor" />
        </svg>
      </button>
      <button
        type="button"
        aria-label={maximized ? 'Restore' : 'Maximize'}
        onClick={onMaximize}
        className="inline-flex h-full w-[46px] items-center justify-center text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-100"
      >
        {maximized ? (
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path
              d="M2.5 2.5h5v5h-5v-5zm1 1v3h3v-3h-3z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            />
          </svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <rect
              x="0.5"
              y="0.5"
              width="9"
              height="9"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            />
          </svg>
        )}
      </button>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="inline-flex h-full w-[46px] items-center justify-center text-zinc-400 transition-colors hover:bg-[#c42b1c] hover:text-white"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <path
            d="M1 1l8 8M9 1L1 9"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  )
}

export function TitleBar() {
  const [platform, setPlatform] = useState<NodeJS.Platform>('darwin')
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    void window.api.app.getPlatform().then((p) => {
      setPlatform(p)
      document.documentElement.dataset.platform = p === 'darwin' ? 'mac' : p === 'win32' ? 'win' : 'linux'
    })
    void window.api.window.isMaximized().then(setMaximized)
    return window.api.window.onMaximizedChange(setMaximized)
  }, [])

  const isMac = platform === 'darwin'

  const handleDoubleClick = () => {
    void window.api.window.maximize()
  }

  return (
    <header
      style={{ height: TITLEBAR_HEIGHT }}
      className={cn(
        'titlebar app-drag relative flex shrink-0 items-center border-b border-white/[0.06]',
        'bg-zinc-950/95 backdrop-blur-xl',
        isMac ? 'titlebar-mac' : 'titlebar-win'
      )}
      onDoubleClick={handleDoubleClick}
    >
      {/* macOS: native traffic lights sit in left inset; brand follows */}
      {isMac ? (
        <>
          <div className="flex min-w-0 items-center pl-[78px] pr-4">
            <AppBrand compact />
          </div>
          <div className="flex-1" />
        </>
      ) : (
        <>
          {/* Windows / Linux: brand left, title centered, controls right */}
          <div className="flex min-w-0 items-center px-4">
            <AppBrand />
          </div>

          <div className="pointer-events-none absolute inset-x-0 flex justify-center px-40">
            <span className="truncate text-[12px] font-medium text-zinc-500">
              PicClick Watcher
            </span>
          </div>

          <div className="flex-1" />

          <WindowsControls
            maximized={maximized}
            onMinimize={() => void window.api.window.minimize()}
            onMaximize={() => void window.api.window.maximize()}
            onClose={() => void window.api.window.close()}
          />
        </>
      )}
    </header>
  )
}
