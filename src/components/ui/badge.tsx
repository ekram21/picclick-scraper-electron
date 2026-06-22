import * as React from 'react'
import { cn } from '@/lib/utils'

const variants = {
  default: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  secondary: 'bg-zinc-800 text-zinc-300 border-zinc-700',
  destructive: 'bg-red-500/15 text-red-300 border-red-500/20',
  outline: 'border border-border text-foreground'
} as const

export function Badge({
  className,
  variant = 'default',
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: keyof typeof variants }) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className
      )}
      {...props}
    />
  )
}
