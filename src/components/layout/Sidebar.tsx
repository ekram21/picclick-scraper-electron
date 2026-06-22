import { NavLink } from 'react-router-dom'
import {
  Bell,
  Eye,
  LayoutDashboard,
  Settings,
  Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/watchers', label: 'Watchers', icon: Eye },
  { to: '/alerts', label: 'Alerts', icon: Bell },
  { to: '/settings', label: 'Settings', icon: Settings }
]

export function Sidebar() {
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-white/5 bg-zinc-950/60 backdrop-blur-xl">
      <nav className="flex flex-1 flex-col gap-1 p-4 pt-5">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                isActive
                  ? 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20'
                  : 'text-muted-foreground hover:bg-zinc-900 hover:text-foreground'
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/5 p-4">
        <div className="rounded-lg bg-gradient-to-br from-emerald-500/10 to-indigo-500/10 p-4 ring-1 ring-white/5">
          <div className="mb-1 flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-emerald-400" />
            Live monitoring
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Runs in the background and sends Discord alerts when new listings match your filters.
          </p>
        </div>
      </div>
    </aside>
  )
}
