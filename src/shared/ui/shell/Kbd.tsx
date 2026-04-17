import type { ComponentPropsWithoutRef } from 'react'

import { cn } from '@/shared/lib/utils'

export function Kbd({
  className,
  ...props
}: ComponentPropsWithoutRef<'kbd'>) {
  return (
    <kbd
      className={cn(
        'inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-border bg-background px-2 text-[11px] font-medium text-muted-foreground shadow-[var(--sf-shadow-panel)]',
        className,
      )}
      {...props}
    />
  )
}
