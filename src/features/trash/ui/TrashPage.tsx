import { Badge } from '@/shared/ui/base/badge'
import { Button } from '@/shared/ui/base/button'
import { PanelSurface } from '@/shared/ui/shell/PanelSurface'
import { RotateCcwIcon, Trash2Icon } from 'lucide-react'

export function TrashPage() {
  return (
    <PanelSurface
      description="Trash 在 M1-B 先验证危险态、恢复操作和轻量说明区的视觉语气。"
      eyebrow="Trash"
      title="可恢复，不是最终销毁"
    >
      <div className="space-y-3">
        {[
          ['任务 · 重写 AppFrame', '今天删除'],
          ['项目 · Demo Project', '昨天删除'],
        ].map(([title, time]) => (
          <div
            key={title}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-background px-4 py-3"
          >
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">{title}</p>
              <p className="text-xs text-muted-foreground">{time}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">可恢复</Badge>
              <Button size="sm" variant="secondary">
                <RotateCcwIcon data-icon="inline-start" />
                恢复
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
  )
}
