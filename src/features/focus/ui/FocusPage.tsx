import { Badge } from '@/shared/ui/base/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/base/tabs'
import { PanelSurface } from '@/shared/ui/shell/PanelSurface'

export function FocusPage() {
  return (
    <PanelSurface
      description="Focus 页在 M1-B 只负责校准 Tabs、内容区和聚合视图的层级，不碰真实筛选逻辑。"
      eyebrow="Focus"
      title="聚合视图骨架"
    >
      <Tabs className="gap-4" defaultValue="today">
        <TabsList>
          <TabsTrigger value="today">Focus</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="recent">最近添加</TabsTrigger>
          <TabsTrigger value="priority">高优先级</TabsTrigger>
        </TabsList>
        <TabsContent value="today">
          <div className="grid gap-3 md:grid-cols-3">
            {[
              ['需要执行', '4', 'secondary'],
              ['接近截止', '2', 'outline'],
              ['已完成回看', '7', 'default'],
            ].map(([label, count, variant]) => (
              <div
                key={label}
                className="rounded-xl border border-border/70 bg-background px-4 py-4"
              >
                <p className="text-sm text-muted-foreground">{label}</p>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-2xl font-semibold tracking-[-0.03em] text-foreground">
                    {count}
                  </p>
                  <Badge variant={variant as 'default' | 'secondary' | 'outline'}>
                    Ready
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="upcoming">
          <p className="text-sm text-muted-foreground">
            Upcoming 预留给后续日期分组和执行上下文。
          </p>
        </TabsContent>
        <TabsContent value="recent">
          <p className="text-sm text-muted-foreground">
            最近添加会承接快速捕获后的回看入口。
          </p>
        </TabsContent>
        <TabsContent value="priority">
          <p className="text-sm text-muted-foreground">
            高优先级仍然是执行视图，不是另一套数据层。
          </p>
        </TabsContent>
      </Tabs>
    </PanelSurface>
  )
}
