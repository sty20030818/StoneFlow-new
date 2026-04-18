import { useShellLayoutStore } from '@/app/layouts/shell/model/useShellLayoutStore'
import { Badge } from '@/shared/ui/base/badge'
import { Button } from '@/shared/ui/base/button'
import { PanelSurface } from '@/shared/ui/PanelSurface'
import { RotateCcwIcon, Trash2Icon } from 'lucide-react'

const trashItems = [
  {
    kind: 'task' as const,
    id: 'task-trash-appframe',
    title: '任务 · 清理旧的壳层命名',
    time: '今天删除',
  },
  {
    kind: 'project' as const,
    id: 'product-design',
    title: '项目 · 产品设计',
    time: '昨天删除',
  },
]

export function TrashPage() {
  const openDrawer = useShellLayoutStore((state) => state.openDrawer)

  return (
    <div className="p-4">
      <PanelSurface eyebrow="Trash" title="回收站">
        <div className="flex flex-col gap-3">
          {trashItems.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-background px-4 py-3"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.time}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">可恢复</Badge>
                <Button
                  onClick={() => openDrawer(item.kind, item.id)}
                  size="sm"
                  variant="secondary"
                >
                  <RotateCcwIcon data-icon="inline-start" />
                  恢复信息
                </Button>
                <Button size="sm" variant="ghost">
                  <Trash2Icon data-icon="inline-start" />
                  清除
                </Button>
              </div>
            </div>
          ))}
        </div>
      </PanelSurface>
    </div>
  )
}
