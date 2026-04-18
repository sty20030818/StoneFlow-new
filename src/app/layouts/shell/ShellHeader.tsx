import { startTransition, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  getSectionLabel,
  getSpaceLabel,
  SHELL_COMMAND_CREATE_TARGET,
  SHELL_COMMAND_PROJECT_TARGET,
  SHELL_NAV_ITEMS,
  SHELL_PROJECT_LINKS,
} from '@/app/layouts/shell/config'
import type {
  ShellDrawerKind,
  ShellSectionKey,
} from '@/app/layouts/shell/types'
import { Kbd } from '@/shared/ui/Kbd'
import { Button } from '@/shared/ui/base/button'
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
import { getCurrentWindow } from '@tauri-apps/api/window'
import {
  MinusIcon,
  PlusIcon,
  SearchIcon,
  SquareIcon,
  XIcon,
} from 'lucide-react'

type ShellHeaderProps = {
  currentSpaceId: string
  activeSection: ShellSectionKey
  isCommandOpen: boolean
  onCommandOpenChange: (open: boolean) => void
  onOpenDrawer: (kind: ShellDrawerKind, id: string) => void
}

export function ShellHeader({
  currentSpaceId,
  activeSection,
  isCommandOpen,
  onCommandOpenChange,
  onOpenDrawer,
}: ShellHeaderProps) {
  const navigate = useNavigate()
  const [isMaximized, setIsMaximized] = useState(false)
  const isMac = useMemo(
    () => /Mac|iPhone|iPad|iPod/i.test(window.navigator.userAgent),
    [],
  )

  useEffect(() => {
    let disposed = false

    async function syncWindowState() {
      try {
        const currentWindow = getCurrentWindow()
        const maximized = await currentWindow.isMaximized()

        if (!disposed) {
          setIsMaximized(maximized)
        }
      } catch {
        if (!disposed) {
          setIsMaximized(false)
        }
      }
    }

    void syncWindowState()

    return () => {
      disposed = true
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        onCommandOpenChange(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onCommandOpenChange])

  const handleNavigate = (to: string) => {
    onCommandOpenChange(false)
    startTransition(() => {
      navigate(to)
    })
  }

  const handleMinimize = async () => {
    try {
      await getCurrentWindow().minimize()
    } catch {
      // 浏览器预览下静默失败。
    }
  }

  const handleToggleMaximize = async () => {
    try {
      const currentWindow = getCurrentWindow()
      await currentWindow.toggleMaximize()
      setIsMaximized(await currentWindow.isMaximized())
    } catch {
      setIsMaximized((current) => !current)
    }
  }

  const handleClose = async () => {
    try {
      await getCurrentWindow().close()
    } catch {
      // 浏览器预览下静默失败。
    }
  }

  return (
    <>
      <header className="relative flex h-11 shrink-0 bg-(--sf-color-shell-chrome)">
        <div
          className="flex w-(--sf-shell-sidebar-width) items-center gap-2 px-3"
          data-tauri-drag-region
          onDoubleClick={() => {
            if (!isMac) {
              void handleToggleMaximize()
            }
          }}
        >
          {isMac ? (
            <div className="flex items-center gap-1.5">
              <span className="size-2.75 rounded-full bg-[#ff5f57]" />
              <span className="size-2.75 rounded-full bg-[#ffbd2e]" />
              <span className="size-2.75 rounded-full bg-[#28c840]" />
            </div>
          ) : (
            <>
              <div className="flex size-5 items-center justify-center rounded-[0.3125rem] bg-black text-[10px] font-semibold text-white">
                S
              </div>
              <span className="text-[13px] font-medium text-foreground">StoneFlow</span>
            </>
          )}
        </div>

        <div
          className={`flex min-w-0 flex-1 items-center justify-center px-3 ${isMac ? 'pl-6' : ''}`}
          data-tauri-drag-region
          onDoubleClick={() => {
            if (!isMac) {
              void handleToggleMaximize()
            }
          }}
        >
          <button
            className="flex h-6.75 w-52.5 items-center gap-2 rounded-[0.4375rem] border border-black/10 bg-black/7 px-2.5 text-left"
            onClick={() => onCommandOpenChange(true)}
            type="button"
          >
            <SearchIcon className="size-3.5 shrink-0 text-(--sf-color-shell-tertiary)" />
            <span className="flex-1 text-[12px] text-(--sf-color-shell-tertiary)">
              Search...
            </span>
            <Kbd className="bg-black/7">⌘K</Kbd>
          </button>
        </div>

        <div
          className={`flex shrink-0 items-center ${isMac ? 'gap-2 px-2.5' : 'gap-0 pl-2.5 pr-0'}`}
        >
          <Button
            className="h-6.5 gap-1.5 rounded-[0.375rem] border-black/12 bg-black/8 px-2.5 text-[12px] font-medium text-foreground hover:bg-black/10"
            onClick={() =>
              onOpenDrawer(
                SHELL_COMMAND_CREATE_TARGET.kind,
                SHELL_COMMAND_CREATE_TARGET.id,
              )
            }
            variant="outline"
          >
            <PlusIcon className="size-3" />
            <span>New task</span>
            <Kbd className="bg-black/7">C</Kbd>
          </Button>

          {!isMac ? (
            <div className="flex h-full items-stretch pl-3">
              <div className="my-auto mr-3 h-5 w-px bg-black/10" />
              <Button
                className="size-11 rounded-none border-0 bg-transparent shadow-none ring-0 text-(--sf-color-shell-secondary) hover:bg-black/14 hover:text-foreground"
                onClick={() => void handleMinimize()}
                variant="ghost"
              >
                <MinusIcon className="size-3.5" />
              </Button>
              <Button
                className="size-11 rounded-none border-0 bg-transparent shadow-none ring-0 text-(--sf-color-shell-secondary) hover:bg-black/14 hover:text-foreground"
                onClick={() => void handleToggleMaximize()}
                variant="ghost"
              >
                <SquareIcon className={`size-3 ${isMaximized ? 'scale-[0.88]' : ''}`} />
              </Button>
              <Button
                className="size-11 rounded-none border-0 bg-transparent shadow-none ring-0 hover:bg-[#E81123] hover:text-white"
                onClick={() => void handleClose()}
                variant="ghost"
              >
                <XIcon className="size-3.5" />
              </Button>
            </div>
          ) : null}
        </div>
      </header>

      <CommandDialog
        className="max-w-2xl border border-border/80 bg-popover/98 shadow-(--sf-shadow-float)"
        description={`${getSpaceLabel(currentSpaceId)} · ${getSectionLabel(activeSection)}`}
        onOpenChange={onCommandOpenChange}
        open={isCommandOpen}
        title="StoneFlow Command"
      >
        <Command className="bg-transparent">
          <CommandInput placeholder="创建任务、跳转页面或打开详情…" />
          <CommandList className="no-scrollbar max-h-96 overflow-y-auto">
            <CommandEmpty>没有结果</CommandEmpty>

            <CommandGroup heading="Quick Actions">
              <CommandItem
                onSelect={() => {
                  onCommandOpenChange(false)
                  onOpenDrawer(
                    SHELL_COMMAND_CREATE_TARGET.kind,
                    SHELL_COMMAND_CREATE_TARGET.id,
                  )
                }}
              >
                <PlusIcon />
                创建任务草稿
                <CommandShortcut>↵</CommandShortcut>
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  onCommandOpenChange(false)
                  onOpenDrawer(
                    SHELL_COMMAND_PROJECT_TARGET.kind,
                    SHELL_COMMAND_PROJECT_TARGET.id,
                  )
                }}
              >
                <SearchIcon />
                打开当前项目摘要
                <CommandShortcut>⌥P</CommandShortcut>
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Navigate">
              {SHELL_NAV_ITEMS.map((item) => (
                <CommandItem
                  key={item.key}
                  onSelect={() => handleNavigate(item.to(currentSpaceId))}
                  value={item.label}
                >
                  <item.icon />
                  {item.label}
                  {item.badge ? <CommandShortcut>{item.badge}</CommandShortcut> : null}
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Projects">
              {SHELL_PROJECT_LINKS.map((project) => (
                <CommandItem
                  key={project.id}
                  onSelect={() =>
                    handleNavigate(`/space/${currentSpaceId}/project/${project.id}`)
                  }
                  value={project.label}
                >
                  <SearchIcon />
                  {project.label}
                  {project.badge ? (
                    <CommandShortcut>{project.badge}</CommandShortcut>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}
