import * as React from 'react'

export type SidebarLayoutMode = 'desktop' | 'mobile'
export type SidebarDesktopState = 'expanded' | 'collapsed'
export type SidebarVisualState =
	| 'desktop-expanded'
	| 'desktop-collapsed'
	| 'mobile-open'
	| 'mobile-closed'

export type SidebarGeometry = {
	panelWidth: string
	panelOffsetX: string
	reservedWidth: string
	overlayOpacity: number
}

export type SidebarContextValue = {
	layoutMode: SidebarLayoutMode
	desktopPreference: SidebarDesktopState
	mobileOpen: boolean
	visualState: SidebarVisualState
	geometry: SidebarGeometry
	panelWidth: string
	panelOffsetX: string
	reservedWidth: string
	overlayOpacity: number
	sidebarWidth: number
	isMobile: boolean
	toggleSidebar: () => void
	setDrawerOpen: (open: boolean) => void
	setSidebarWidth: (width: number) => void
}

export const SidebarContext = React.createContext<SidebarContextValue | null>(null)

export function useSidebar() {
	const context = React.useContext(SidebarContext)

	if (!context) {
		throw new Error('useSidebar 必须运行在 SidebarProvider 内部')
	}

	return context
}
