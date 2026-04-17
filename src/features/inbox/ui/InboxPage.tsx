import { Badge } from '@/shared/ui/base/badge'
import { Button } from '@/shared/ui/base/button'
import { Separator } from '@/shared/ui/base/separator'
import { PanelSurface } from '@/shared/ui/shell/PanelSurface'
import { ArrowRightIcon, ListTodoIcon, SparklesIcon } from 'lucide-react'

export function InboxPage() {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.95fr)]">
      <PanelSurface
        actions={
          <Button variant="outline">
            <SparklesIcon data-icon="inline-start" />
            快速整理
          </Button>
        }
        description="Inbox 页面在 M1-B 先验证列表密度、状态色和轻量动作的视觉约束。"
        eyebrow="Inbox"
        title="待整理队列"
      >
        <div className="space-y-3">
          {[
            ['整理 M1-B 主题变量', 'P1', '今天'],
            ['把 Drawer 做成覆盖式', 'P2', '本周'],
            ['补一个静态壳层验收入口', 'P2', '今天'],
          ].map(([title, priority, due]) => (
            <div
              key={title}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background px-3 py-3"
            >
              <div className="min-w-0 space-y-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {title}
                </p>
                <p className="text-xs text-muted-foreground">
                  当前先展示高频任务行的空间关系与可读性。
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant="outline">{priority}</Badge>
                <Badge variant="secondary">{due}</Badge>
              </div>
            </div>
          ))}
        </div>
      </PanelSurface>

      <PanelSurface
        description="右侧辅助面板用来验证 badge、按钮和分隔线在浅色主题下的稳定性。"
        eyebrow="Actions"
        title="整理约束"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <ListTodoIcon className="size-4 text-primary" />
              所有新任务默认先进 Inbox
            </div>
            <Badge>Default</Badge>
          </div>
          <Separator />
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>当前阶段不接入真实归类动作，只验证高频入口的视觉关系。</p>
            <Button className="w-full justify-between" variant="secondary">
              查看后续整理流
              <ArrowRightIcon />
            </Button>
          </div>
        </div>
      </PanelSurface>
    </div>
  )
}
