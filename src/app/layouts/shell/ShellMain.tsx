import type { PropsWithChildren } from 'react'

export function ShellMain({ children }: PropsWithChildren) {
  return (
    <main className="relative flex min-w-0 flex-1 overflow-hidden bg-transparent">
      <div className="no-scrollbar flex-1 overflow-y-auto pr-2">
        <div className="flex min-h-full min-w-0 flex-col rounded-[0.625rem] bg-card shadow-[6px_0_18px_rgb(15_23_42/0.04)]">
          {children}
        </div>
      </div>
    </main>
  )
}
