import { NavLink } from 'react-router-dom'

import {
  SHELL_NAV_ITEMS,
  SHELL_PROJECT_LINKS,
  SHELL_SPACES,
} from '@/app/layouts/shell/config'
import { Badge } from '@/shared/ui/base/badge'
import { cn } from '@/shared/lib/utils'

type ShellSidebarProps = {
  currentSpaceId: string
}

export function ShellSidebar({ currentSpaceId }: ShellSidebarProps) {
  return (
    <aside className="flex h-full w-(--sf-shell-sidebar-width) shrink-0 flex-col bg-(--sf-color-shell-chrome)">
      <div className="px-1.5 pb-4 pt-1.5">
        <div className="flex gap-1 rounded-xl p-1">
          {SHELL_SPACES.map((space) => (
            <NavLink
              className={({ isActive }) =>
                cn(
                  'flex h-6 flex-1 items-center justify-center rounded-[0.375rem] text-[12px] font-medium transition-colors',
                  isActive
                    ? 'bg-black/10 text-foreground'
                    : 'text-muted-foreground hover:bg-black/5 hover:text-foreground',
                )
              }
              key={space.id}
              to={`/space/${space.id}/inbox`}
            >
              {space.label}
            </NavLink>
          ))}
        </div>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto pb-4">
        <nav className="space-y-0.5 px-1.5">
          {SHELL_NAV_ITEMS.map((item) => (
            <NavLink
              className={({ isActive }) =>
                cn(
                  'flex h-8 items-center gap-2 rounded-xl px-2.5 text-[13px] transition-colors',
                  isActive
                    ? 'bg-black/9 font-medium text-foreground'
                    : 'text-(--sf-color-shell-secondary) hover:bg-black/5 hover:text-foreground',
                )
              }
              key={item.key}
              to={item.to(currentSpaceId)}
            >
              <item.icon className="size-3.5 shrink-0" />
              <span>{item.label}</span>
              {item.badge ? (
                <Badge className="ml-auto rounded-full px-1.5 py-0 text-[10px]" variant="outline">
                  {item.badge}
                </Badge>
              ) : null}
            </NavLink>
          ))}
        </nav>

        <section className="space-y-1 px-1.5">
          <p className="px-2.5 text-[11px] font-medium tracking-[0.04em] text-(--sf-color-shell-tertiary)">
            Projects
          </p>
          {SHELL_PROJECT_LINKS.map((project) => (
            <NavLink
              className={({ isActive }) =>
                cn(
                  'flex h-8 items-center gap-2 rounded-xl px-2.5 text-[13px] transition-colors',
                  project.id === 'stoneflow-v1' ? 'pl-6' : '',
                  isActive
                    ? 'bg-black/9 font-medium text-foreground'
                    : 'text-(--sf-color-shell-secondary) hover:bg-black/5 hover:text-foreground',
                )
              }
              key={project.id}
              to={`/space/${currentSpaceId}/project/${project.id}`}
            >
              <span className="size-3 rounded-lg bg-black/12" />
              <span>{project.label}</span>
              {project.badge ? (
                <span className="ml-auto text-[10px] text-(--sf-color-shell-tertiary)">
                  {project.badge}
                </span>
              ) : null}
            </NavLink>
          ))}
        </section>
      </div>
    </aside>
  )
}
