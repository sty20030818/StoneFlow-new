import type { ComponentType } from 'react'

import {
	BriefcaseBusinessIcon,
	GraduationCapIcon,
	HouseIcon,
	OrbitIcon,
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
}

export type SpaceVisualDefinition = SpaceIconDefinition & SpaceColorDefinition

export const ALL_SPACES_VISUAL: SpaceVisualDefinition = {
	label: '所有空间',
	icon: OrbitIcon,
	iconClassName: 'text-[#8b5cf6]',
	iconBadgeClassName: 'bg-[#8b5cf6]',
}

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

export const SPACE_COLOR_OPTIONS = [
	{
		value: 'blue',
		label: '蓝色',
		colorValue: '#3f7ad6',
		iconClassName: 'text-[#3f7ad6]',
		iconBadgeClassName: 'bg-[#3f7ad6]',
	},
	{
		value: 'green',
		label: '绿色',
		colorValue: '#2da44e',
		iconClassName: 'text-[#2da44e]',
		iconBadgeClassName: 'bg-[#2da44e]',
	},
	{
		value: 'amber',
		label: '琥珀',
		colorValue: '#e58a00',
		iconClassName: 'text-[#e58a00]',
		iconBadgeClassName: 'bg-[#e58a00]',
	},
	{
		value: 'rose',
		label: '玫红',
		colorValue: '#d9485f',
		iconClassName: 'text-[#d9485f]',
		iconBadgeClassName: 'bg-[#d9485f]',
	},
	{
		value: 'slate',
		label: '石板灰',
		colorValue: '#64748b',
		iconClassName: 'text-[#64748b]',
		iconBadgeClassName: 'bg-[#64748b]',
	},
] as const

export type SpaceColorKey = (typeof SPACE_COLOR_OPTIONS)[number]['value']

export const SPACE_ICON_OPTIONS = Object.entries(SPACE_ICON_VISUALS).map(([key, visual]) => ({
	value: key,
	label: visual.label,
	icon: visual.icon,
}))

export function getSpaceIconOption(iconKey: string) {
	return SPACE_ICON_OPTIONS.find((option) => option.value === iconKey) ?? SPACE_ICON_OPTIONS[0]
}

export function getSpaceColorOption(colorKey: string) {
	return SPACE_COLOR_OPTIONS.find((option) => option.value === colorKey) ?? SPACE_COLOR_OPTIONS[0]
}

export function getSpaceColorKeyByValue(colorValue: string): SpaceColorKey | null {
	return (
		SPACE_COLOR_OPTIONS.find((option) => option.colorValue === colorValue.toLowerCase())?.value ??
		null
	)
}

export function isSpaceColorKey(value: string): value is SpaceColorKey {
	return SPACE_COLOR_OPTIONS.some((option) => option.value === value)
}

/**
 * 把 Space 的 iconKey + colorKey 解析成统一视觉 token。
 */
export function getSpaceVisual(space: Pick<Space, 'iconKey' | 'colorKey'>): SpaceVisualDefinition {
	const iconVisual = SPACE_ICON_VISUALS[space.iconKey] ?? SPACE_ICON_VISUALS.user
	const colorVisual = getSpaceColorOption(space.colorKey)

	return {
		label: colorVisual.label,
		icon: iconVisual.icon,
		iconClassName: colorVisual.iconClassName,
		iconBadgeClassName: colorVisual.iconBadgeClassName,
	}
}
