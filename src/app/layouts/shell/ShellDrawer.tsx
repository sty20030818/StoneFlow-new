import { getDrawerDetail } from '@/app/layouts/shell/config'
import type { ShellDrawerKind } from '@/app/layouts/shell/types'
import { Badge } from '@/shared/ui/base/badge'
import { Button } from '@/shared/ui/base/button'
import { XIcon } from 'lucide-react'

type ShellDrawerProps = {
  open: boolean
  activeDrawerKind: ShellDrawerKind | null
  activeDrawerId: string | null
  onClose: () => void
}

export function ShellDrawer({
  open,
  activeDrawerKind,
  activeDrawerId,
  onClose,
}: ShellDrawerProps) {
  const detail = getDrawerDetail(activeDrawerKind, activeDrawerId)

  return (
    <aside
      aria-hidden={!open}
      className={`absolute inset-y-0 right-0 z-30 flex w-(--sf-shell-drawer-width) flex-col border-l border-black/7 bg-(--sf-color-shell-drawer) transition-transform duration-200 ${
        open ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <header className="flex h-10.5 shrink-0 items-center justify-between border-b border-black/6 px-3.5">
        <div className="text-[13px] font-medium text-foreground">Task detail</div>
        <Button
          className="size-5 rounded-[0.35rem]"
          onClick={onClose}
          size="icon-sm"
          variant="ghost"
        >
          <XIcon className="size-3.5" />
        </Button>
      </header>

      <div className="no-scrollbar flex-1 overflow-y-auto px-3.5 py-3">
        {detail ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {detail.badges.map((badge) => (
                  <Badge key={badge.label} variant={badge.variant ?? 'secondary'}>
                    {badge.label}
                  </Badge>
                ))}
              </div>
              <h2 className="text-[13px] font-medium leading-6 text-foreground">
                {detail.title}
              </h2>
              <Button className="h-8 w-full justify-center rounded-xl" variant="outline">
                标记完成
              </Button>
            </div>

            {detail.sections.map((section) => (
              <section className="space-y-1.5" key={section.title}>
                <p className="text-[11px] font-medium tracking-[0.03em] text-(--sf-color-shell-tertiary)">
                  {section.title}
                </p>
                <div className="space-y-1.5">
                  {section.items.map((item) => (
                    <div
                      className="rounded-xl border border-black/6 bg-black/3 px-2.5 py-2"
                      key={`${section.title}-${item.label}`}
                    >
                      <p className="text-[11px] text-(--sf-color-shell-tertiary)">
                        {item.label}
                      </p>
                      <p className="mt-1 text-[12px] leading-5 text-foreground">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="text-[12px] text-(--sf-color-shell-tertiary)">
            当前没有可展示的详情。
          </div>
        )}
      </div>
    </aside>
  )
}
