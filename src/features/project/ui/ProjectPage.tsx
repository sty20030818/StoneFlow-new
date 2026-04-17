import { useParams } from 'react-router-dom'

import { Badge } from '@/shared/ui/base/badge'
import { Button } from '@/shared/ui/base/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/base/dropdown-menu'
import { PanelSurface } from '@/shared/ui/shell/PanelSurface'
import { MoreHorizontalIcon } from 'lucide-react'

export function ProjectPage() {
  const { projectId = 'unknown' } = useParams()

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(20rem,0.9fr)]">
      <PanelSurface
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon-sm" variant="outline">
                <MoreHorizontalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>切换项目状态</DropdownMenuItem>
              <DropdownMenuItem>查看项目备注</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">归档预览</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
        description="Project 页面当前只验证摘要区与分组列表的视觉结构。"
        eyebrow="Project"
        title={`项目预览 · ${projectId}`}
      >
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-border/70 bg-background px-4 py-4">
            <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
              状态
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Badge>Active</Badge>
              <Badge variant="outline">3 tasks</Badge>
            </div>
          </div>
          <div className="rounded-xl border border-border/70 bg-background px-4 py-4">
            <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
              更新时间
            </p>
            <p className="mt-3 text-sm font-medium text-foreground">今天 17:40</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background px-4 py-4">
            <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
              备注
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              项目头部像精密摘要面板，而不是资料卡。
            </p>
          </div>
        </div>
      </PanelSurface>

      <PanelSurface
        description="这里预留给后续状态分组任务列表。"
        eyebrow="Grouped Tasks"
        title="按状态分组"
      >
        <div className="space-y-3">
          {['Todo', 'Doing', 'Done'].map((column) => (
            <div
              key={column}
              className="rounded-xl border border-border/70 bg-background px-4 py-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">{column}</p>
                <Badge variant="secondary">2</Badge>
              </div>
            </div>
          ))}
        </div>
      </PanelSurface>
    </div>
  )
}
