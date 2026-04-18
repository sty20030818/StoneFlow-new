import type { ComponentPropsWithoutRef } from 'react'

import { cn } from '@/shared/lib/utils'

export function Kbd({
  className,
  ...props
}: ComponentPropsWithoutRef<'kbd'>) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-[0.3125rem] border border-border/80 bg-background/88 px-1.5 text-[10px] font-medium text-muted-foreground',
        className,
      )}
      {...props}
    />
  )
}
