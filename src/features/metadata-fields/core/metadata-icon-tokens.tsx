import {
	Calendar1Icon,
	CalendarCogIcon,
	CalendarDaysIcon,
	CalendarIcon,
	CalendarOffIcon,
	CalendarX2Icon,
	FolderIcon,
	OrbitIcon,
	TargetIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'

import type { MetadataActionIconKey } from './metadata-action-spec'

/** 域图标渲染器（由 task 等在装配根注册，断开 meta→task 硬依赖）。 */
type DomainIconRenderer = (iconKey: MetadataActionIconKey) => ReactNode

let domainIconRenderer: DomainIconRenderer | null = null

export function setMetadataDomainIconRenderer(renderer: DomainIconRenderer | null) {
	domainIconRenderer = renderer
}

export function renderMetadataActionIcon(iconKey: MetadataActionIconKey | undefined) {
	if (!iconKey) {
		return null
	}

	if (iconKey.startsWith('status-') || iconKey.startsWith('priority-')) {
		return domainIconRenderer?.(iconKey) ?? null
	}

	switch (iconKey) {
		case 'calendar-off':
			return <CalendarOffIcon className='size-3.5 text-muted' />
		case 'calendar-1':
			return <Calendar1Icon className='size-3.5 text-muted' />
		case 'calendar-days':
			return <CalendarDaysIcon className='size-3.5 text-muted' />
		case 'calendar-cog':
			return <CalendarCogIcon className='size-3.5 text-muted' />
		case 'calendar-x-2':
			return <CalendarX2Icon className='size-3.5 text-muted' />
		case 'folder':
			return <FolderIcon className='size-3.5 text-muted' />
		case 'target':
			return <TargetIcon className='size-3.5 text-muted' />
		case 'space':
			return <OrbitIcon className='size-3.5 text-muted' />
		default:
			return <CalendarIcon className='size-3.5 text-muted' />
	}
}
