'use client'

import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'
import { Separator } from '@/shared/ui/base/separator'
import {
	settingsPanelDescriptionClass,
	settingsPanelHeaderWrapClass,
	settingsPanelTitleClass,
} from '@/shared/ui/patterns/settings-panel'

type DisplayOptionsSectionProps = {
	title: string
	description?: string
	children: ReactNode
	className?: string
}

/**
 * 统一每个 display section 的标题、说明与内容节奏，避免面板内部再散落布局样式。
 */
export function DisplayOptionsSection({
	title,
	description,
	children,
	className,
}: DisplayOptionsSectionProps) {
	return (
		<section className={cn('flex flex-col gap-3', className)}>
			<div className={settingsPanelHeaderWrapClass}>
				<h3 className={settingsPanelTitleClass}>{title}</h3>
				{description ? <p className={settingsPanelDescriptionClass}>{description}</p> : null}
			</div>
			{children}
			<Separator />
		</section>
	)
}
