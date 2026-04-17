import type { PropsWithChildren } from 'react'
import { NavLink } from 'react-router-dom'

type AppFrameProps = PropsWithChildren<{
  currentSpaceId: string
}>

const navItems = [
  {
    label: 'Inbox',
    to: (spaceId: string) => `/space/${spaceId}/inbox`,
  },
  {
    label: 'Focus',
    to: (spaceId: string) => `/space/${spaceId}/focus`,
  },
  {
    label: 'Project',
    to: (spaceId: string) => `/space/${spaceId}/project/demo-project`,
  },
  {
    label: 'Trash',
    to: (spaceId: string) => `/space/${spaceId}/trash`,
  },
]

export function AppFrame({ children, currentSpaceId }: AppFrameProps) {
  return (
    <div className="app-frame">
      <aside className="sidebar">
        <div>
          <p className="brand-kicker">StoneFlow</p>
          <h2 className="brand-title">M1-A 工程骨架</h2>
          <p className="brand-copy">
            当前先验证 feature-first、正式路由和 Tauri 前端宿主结构。
          </p>
        </div>

        <nav className="nav-list" aria-label="主导航">
          {navItems.map((item) => (
            <NavLink
              key={item.label}
              className={({ isActive }) =>
                isActive ? 'nav-link nav-link--active' : 'nav-link'
              }
              to={item.to(currentSpaceId)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <span className="topbar-label">Current Space</span>
            <strong>{currentSpaceId}</strong>
          </div>
          <div className="topbar-badge">React Router + Zustand</div>
        </header>

        <div className="page-shell">{children}</div>
      </main>
    </div>
  )
}
