import { useShellLayoutStore } from '@/app/layouts/shell/model/useShellLayoutStore'
import { Badge } from '@/shared/ui/base/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/base/tabs'
import { ListItem } from '@/shared/ui/ListItem'
import { PanelSurface } from '@/shared/ui/PanelSurface'

const focusStats = [
  {
    label: '需要执行',
    count: '4',
    badge: 'Ready',
    variant: 'secondary' as const,
  },
  {
    label: '接近截止',
    count: '2',
    badge: 'Soon',
    variant: 'outline' as const,
  },
  {
    label: '已完成回看',
    count: '7',
    badge: 'Review',
    variant: 'default' as const,
  },
]

const upcomingRows = [
  {
    id: 'task-focus-upcoming',
    title: '周二前补齐 Drawer 关闭语义',
    description: '先把 Esc、遮罩点击与按钮关闭统一起来。',
    badge: 'Tue',
  },
  {
    id: 'task-project-sidebar-polish',
    title: '本周收口 Sidebar 的密度',
    description: 'Space、主导航和项目入口保持同一套桌面节奏。',
    badge: 'Week',
  },
]

const recentRows = [
  {
    id: 'task-command-capture',
    title: '刚刚新增 Header 详情入口',
    description: '先验证顶部入口与 Drawer 的闭环。',
    badge: 'Now',
  },
  {
    id: 'task-inbox-command',
    title: '命令面板导航分组调整',
    description: '保留 Quick Actions / Navigate / Projects 三段。',
    badge: 'Recent',
  },
]

const priorityRows = [
  {
    id: 'task-focus-deep-work',
    title: '收口 M1-C 的壳层密度',
    description: '继续把工作台从网页感拉回桌面感。',
    badge: 'P1',
  },
  {
    id: 'task-project-shell-refactor',
    title: '让新 Shell 边界真正稳定',
    description: '组件命名、层级和滚动边界保持一致。',
    badge: 'P1',
  },
]

export function FocusPage() {
  const openDrawer = useShellLayoutStore((state) => state.openDrawer)

  return (
    <div className="p-4">
      <PanelSurface
        eyebrow="Focus"
        title="聚合视图工作台"
      >
        <Tabs className="gap-5" defaultValue="focus">
          <TabsList>
            <TabsTrigger value="focus">Focus</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="recent">最近添加</TabsTrigger>
            <TabsTrigger value="priority">高优先级</TabsTrigger>
          </TabsList>

          <TabsContent value="focus">
            <div className="flex flex-col gap-5">
              <div className="grid gap-3 md:grid-cols-3">
                {focusStats.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-border/70 bg-background px-4 py-4"
                  >
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-2xl font-semibold tracking-[-0.03em] text-foreground">
                        {item.count}
                      </p>
                      <Badge variant={item.variant}>{item.badge}</Badge>
                    </div>
                  </div>
                ))}
              </div>

              <PanelSurface eyebrow="Today" title="当前执行面板">
                <div className="flex flex-col gap-3">
                  <ListItem
                    description="先让壳层骨架、导航和 Drawer 的空间关系稳定下来。"
                    onClick={() => openDrawer('task', 'task-focus-deep-work')}
                    title="收口 M1-C 的壳层密度"
                    trailing={<Badge variant="outline">P1</Badge>}
                  />
                  <ListItem
                    description="预留时间驱动的执行视图，但不扩成更多路由层级。"
                    onClick={() => openDrawer('task', 'task-focus-upcoming')}
                    title="为 Upcoming 留出日期视图骨架"
                    trailing={<Badge variant="secondary">Upcoming</Badge>}
                  />
                  <ListItem
                    description="最近添加和高优先级继续留在 Focus 内部切片。"
                    onClick={() => openDrawer('task', 'task-focus-review')}
                    title="保留完成回看入口"
                    trailing={<Badge variant="outline">Later</Badge>}
                  />
                </div>
              </PanelSurface>
            </div>
          </TabsContent>

          <TabsContent value="upcoming">
            <div className="flex flex-col gap-3">
              {upcomingRows.map((row) => (
                <ListItem
                  description={row.description}
                  key={row.id}
                  onClick={() => openDrawer('task', row.id)}
                  title={row.title}
                  trailing={<Badge variant="secondary">{row.badge}</Badge>}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="recent">
            <div className="flex flex-col gap-3">
              {recentRows.map((row) => (
                <ListItem
                  description={row.description}
                  key={row.id}
                  onClick={() => openDrawer('task', row.id)}
                  title={row.title}
                  trailing={<Badge variant="outline">{row.badge}</Badge>}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="priority">
            <div className="flex flex-col gap-3">
              {priorityRows.map((row) => (
                <ListItem
                  description={row.description}
                  key={row.id}
                  onClick={() => openDrawer('task', row.id)}
                  title={row.title}
                  trailing={<Badge>{row.badge}</Badge>}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </PanelSurface>
    </div>
  )
}
