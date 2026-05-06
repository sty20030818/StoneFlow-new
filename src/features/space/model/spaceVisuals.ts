import type { ComponentType } from 'react'

import {
	BriefcaseBusinessIcon,
	GraduationCapIcon,
	HouseIcon,
	SparklesIcon,
	UserIcon,
} from 'lucide-react'

import type { Space } from '@/shared/types'

type SpaceIcon = ComponentType<{ className?: string }>

type SpaceIconDefinition = {
	label: string
	icon: SpaceIcon
}

type SpaceColorDefinition = {
	label: string
	iconClassName: string
	iconBadgeClassName: string
	swatchClassName: string
}

export type SpaceVisualDefinition = SpaceIconDefinition & SpaceColorDefinition

const SPACE_ICON_VISUALS: Record<string, SpaceIconDefinition> = {
	user: {
		label: '个人',
		icon: UserIcon,
	},
	briefcase: {
		label: '工作',
		icon: BriefcaseBusinessIcon,
	},
	graduation_cap: {
		label: '学习',
		icon: GraduationCapIcon,
	},
	house: {
		label: '生活',
		icon: HouseIcon,
	},
	sparkles: {
		label: '灵感',
		icon: SparklesIcon,
	},
}

const SPACE_COLOR_VISUALS: Record<string, SpaceColorDefinition> = {
	blue: {
		label: '蓝色',
		iconClassName: 'text-[#3f7ad6]',
		iconBadgeClassName: 'bg-[#3f7ad6]',
		swatchClassName: 'bg-[#3f7ad6]',
	},
	green: {
		label: '绿色',
		iconClassName: 'text-[#2da44e]',
		iconBadgeClassName: 'bg-[#2da44e]',
		swatchClassName: 'bg-[#2da44e]',
	},
	amber: {
		label: '琥珀',
		iconClassName: 'text-[#e58a00]',
		iconBadgeClassName: 'bg-[#e58a00]',
		swatchClassName: 'bg-[#e58a00]',
	},
	rose: {
		label: '玫红',
		iconClassName: 'text-[#d9485f]',
		iconBadgeClassName: 'bg-[#d9485f]',
		swatchClassName: 'bg-[#d9485f]',
	},
	slate: {
		label: '石板灰',
		iconClassName: 'text-[#64748b]',
		iconBadgeClassName: 'bg-[#64748b]',
		swatchClassName: 'bg-[#64748b]',
	},
}

export const SPACE_ICON_OPTIONS = Object.entries(SPACE_ICON_VISUALS).map(([key, visual]) => ({
	value: key,
	label: visual.label,
	icon: visual.icon,
}))

export const SPACE_COLOR_OPTIONS = Object.entries(SPACE_COLOR_VISUALS).map(([key, visual]) => ({
	value: key,
	label: visual.label,
	swatchClassName: visual.swatchClassName,
}))

export function getSpaceIconOption(iconKey: string) {
	return SPACE_ICON_OPTIONS.find((option) => option.value === iconKey) ?? SPACE_ICON_OPTIONS[0]
}

export function getSpaceColorOption(colorKey: string) {
	return SPACE_COLOR_OPTIONS.find((option) => option.value === colorKey) ?? SPACE_COLOR_OPTIONS[0]
}

/**
 * 把 Space 的 iconKey + colorKey 解析成统一视觉 token。
 */
export function getSpaceVisual(space: Pick<Space, 'iconKey' | 'colorKey'>): SpaceVisualDefinition {
	const iconVisual = SPACE_ICON_VISUALS[space.iconKey] ?? SPACE_ICON_VISUALS.user
	const colorVisual = SPACE_COLOR_VISUALS[space.colorKey] ?? SPACE_COLOR_VISUALS.blue

	return {
		...iconVisual,
		...colorVisual,
	}
}
