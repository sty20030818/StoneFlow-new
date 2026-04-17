import { useState } from 'react'
import type { PropsWithChildren } from 'react'
import { NavLink } from 'react-router-dom'

import { Button } from '@/shared/ui/base/button'
import { Badge } from '@/shared/ui/base/badge'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/shared/ui/base/command'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/shared/ui/base/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui/base/sheet'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/ui/base/tooltip'
import { Kbd } from '@/shared/ui/shell/Kbd'
import { PanelSurface } from '@/shared/ui/shell/PanelSurface'
import { cn } from '@/shared/lib/utils'
import {
  BellDotIcon,
  ChevronRightIcon,
  CommandIcon,
  FolderOpenDotIcon,
  InboxIcon,
  Layers3Icon,
  MoreHorizontalIcon,
  SearchIcon,
  SparklesIcon,
  TargetIcon,
  Trash2Icon,
} from 'lucide-react'

type AppFrameProps = PropsWithChildren<{
  currentSpaceId: string
}>

const navItems = [
  {
    label: 'Inbox',
    to: (spaceId: string) => `/space/${spaceId}/inbox`,
    icon: InboxIcon,
    badge: '12',
  },
  {
    label: 'Focus',
    to: (spaceId: string) => `/space/${spaceId}/focus`,
    icon: TargetIcon,
    badge: '4',
  },
  {
    label: 'Project',
    to: (spaceId: string) => `/space/${spaceId}/project/demo-project`,
    icon: FolderOpenDotIcon,
    badge: '3',
  },
  {
    label: 'Trash',
    to: (spaceId: string) => `/space/${spaceId}/trash`,
    icon: Trash2Icon,
    badge: '2',
  },
]

export function AppFrame({ children, currentSpaceId }: AppFrameProps) {
  const [commandOpen, setCommandOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      <div className="grid min-h-screen bg-background lg:grid-cols-[var(--sf-shell-sidebar-width)_minmax(0,1fr)]">
        <aside className="border-b border-sidebar-border bg-sidebar/92 px-4 py-4 lg:border-r lg:border-b-0">
          <div className="flex h-full flex-col gap-6">
            <section className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
                    StoneFlow
                  </p>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-semibold tracking-[-0.03em] text-foreground">
                      Design Foundation
                    </h1>
                    <Badge variant="secondary">M1-B</Badge>
                  </div>
                </div>
                <Button
                  className="rounded-xl"
                  size="icon-sm"
                  variant="outline"
                >
                  <Layers3Icon />
                </Button>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                这一层先把浅色主题、可复用 primitive 和 App Shell 原语立住，
                后面的页面骨架直接在这套底座上长出来。
              </p>
            </section>

            <PanelSurface
              className="bg-sidebar-accent/60"
              description="当前 Space 仍然是静态演示态，但 Command、Drawer、导航和基础组件都已经接到同一套主题。"
              eyebrow="Current Space"
              title={currentSpaceId}
            >
              <div className="flex items-center gap-2">
                <Badge variant="outline">Local-first</Badge>
                <Badge variant="secondary">Keyboard-first</Badge>
              </div>
            </PanelSurface>

            <nav aria-label="主导航" className="space-y-2">
              <p className="px-1 text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
                Workspace
              </p>
          {navItems.map((item) => (
            <NavLink
              key={item.label}
              className={({ isActive }) =>
                cn(
                  'inline-flex h-10 w-full items-center justify-between rounded-xl border px-3 text-sm font-medium transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
                  isActive
                    ? 'border-border bg-background text-foreground shadow-[var(--sf-shadow-panel)]'
                    : 'border-transparent text-muted-foreground hover:bg-sidebar-accent hover:text-foreground',
                )
              }
              to={item.to(currentSpaceId)}
            >
                <span className="flex items-center gap-2">
                  <item.icon className="size-4" />
                  {item.label}
                </span>
                <span className="text-xs text-muted-foreground">{item.badge}</span>
            </NavLink>
          ))}
            </nav>

            <div className="mt-auto space-y-3">
              <PanelSurface
                className="bg-card/75"
                eyebrow="Next"
                title="App Shell Preview"
              >
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Command palette</span>
                    <Kbd>⌘K</Kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Drawer overlay</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDrawerOpen(true)}
                    >
                      打开
                    </Button>
                  </div>
                </div>
              </PanelSurface>
            </div>
          </div>
        </aside>

        <main className="min-w-0">
          <header className="sticky top-0 z-20 border-b border-border/80 bg-background/92 px-5 py-4 backdrop-blur-sm lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
                  Window Chrome
                </p>
                <div className="flex items-center gap-2">
                  <strong className="text-lg font-semibold tracking-[-0.03em] text-foreground">
                    StoneFlow Shell Foundation
                  </strong>
                  <Badge variant="outline">React Router + Zustand</Badge>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className="min-w-72 justify-between rounded-xl bg-card px-3 text-muted-foreground shadow-[var(--sf-shadow-panel)] hover:bg-card"
                      variant="outline"
                      onClick={() => setCommandOpen(true)}
                    >
                      <span className="flex items-center gap-2">
                        <SearchIcon />
                        打开 Global Command Bar
                      </span>
                      <Kbd>⌘K</Kbd>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent sideOffset={8}>
                    这里是 M1-C 会直接复用的 Command 入口。
                  </TooltipContent>
                </Tooltip>

                <Button
                  className="rounded-xl"
                  variant="outline"
                  onClick={() => setDrawerOpen(true)}
                >
                  <SparklesIcon data-icon="inline-start" />
                  查看 Drawer
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="rounded-xl" size="icon-sm" variant="outline">
                      <MoreHorizontalIcon />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Shell Actions</DropdownMenuLabel>
                    <DropdownMenuGroup>
                      <DropdownMenuItem onClick={() => setCommandOpen(true)}>
                        打开 Command
                        <DropdownMenuShortcut>⌘K</DropdownMenuShortcut>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDrawerOpen(true)}>
                        打开 Drawer
                        <DropdownMenuShortcut>⌥D</DropdownMenuShortcut>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      查看设计令牌
                      <ChevronRightIcon className="ml-auto size-4" />
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          <div className="px-5 py-5 lg:px-8 lg:py-8">{children}</div>
        </main>
      </div>

      <CommandDialog
        className="max-w-2xl border border-border/80 bg-popover/98 shadow-[var(--sf-shadow-float)]"
        description="Command 作为壳层主入口，当前先验证 token、分组样式与键盘语义。"
        onOpenChange={setCommandOpen}
        open={commandOpen}
        title="StoneFlow Command"
      >
        <Command className="bg-transparent">
          <CommandInput placeholder="创建任务、跳转路由或打开壳层预览…" />
          <CommandList>
            <CommandEmpty>当前是静态演示态，后续会接真实搜索。</CommandEmpty>
            <CommandGroup heading="Quick Actions">
              <CommandItem onSelect={() => setDrawerOpen(true)}>
                <SparklesIcon />
                打开 Drawer Overlay 预览
                <CommandShortcut>⌥D</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => setCommandOpen(false)}>
                <CommandIcon />
                聚焦当前 Space
                <CommandShortcut>↵</CommandShortcut>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Navigate">
              <CommandItem>
                <InboxIcon />
                Inbox
                <CommandShortcut>G I</CommandShortcut>
              </CommandItem>
              <CommandItem>
                <TargetIcon />
                Focus
                <CommandShortcut>G F</CommandShortcut>
              </CommandItem>
              <CommandItem>
                <Trash2Icon />
                Trash
                <CommandShortcut>G T</CommandShortcut>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>

      <Sheet onOpenChange={setDrawerOpen} open={drawerOpen}>
        <SheetContent
          className="w-[min(28rem,92vw)] border-l border-border/80 bg-popover shadow-[var(--sf-shadow-float)] sm:max-w-none"
          side="right"
        >
          <SheetHeader className="border-b border-border/70 px-5 pb-4">
            <Badge variant="secondary">Drawer Overlay</Badge>
            <SheetTitle>Task Detail Primitive</SheetTitle>
            <SheetDescription>
              M1-B 先校准右侧覆盖式面板的视觉和层级，不把业务字段一次做满。
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
            <PanelSurface
              className="bg-muted/45"
              eyebrow="Task"
              title="把 App Shell 立起来"
              description="这里验证的是 surface、分区、按钮、badge 和细边框关系，而不是业务数据。"
            >
              <div className="flex flex-wrap gap-2">
                <Badge>Inbox</Badge>
                <Badge variant="outline">P1</Badge>
                <Badge variant="secondary">Local draft</Badge>
              </div>
            </PanelSurface>

            <PanelSurface title="Linked Resources">
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center justify-between rounded-xl border border-border/70 bg-background px-3 py-3">
                  <span>Docs / U1-设计系统</span>
                  <Button size="sm" variant="ghost">
                    打开
                  </Button>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border/70 bg-background px-3 py-3">
                  <span>Docs / E1-V1-M1 拆分</span>
                  <Button size="sm" variant="ghost">
                    打开
                  </Button>
                </div>
              </div>
            </PanelSurface>

            <PanelSurface title="Feedback Layer">
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Focus ring</span>
                  <Kbd>Tab</Kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span>Context actions</span>
                  <BellDotIcon className="size-4 text-muted-foreground" />
                </div>
              </div>
            </PanelSurface>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
