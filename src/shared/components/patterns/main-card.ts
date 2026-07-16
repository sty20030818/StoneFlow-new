import { cva } from 'class-variance-authority'

/**
 * Main Card 自身属于产品模式层，承接页面常见的 pill / ghost action / section 容器。
 */
export const mainCardToolbarPillVariants = cva('h-7.5 rounded-full px-3', {
	variants: {
		state: {
			active:
				'border-sf-border-interactive-active bg-sf-surface-interactive-active text-sf-text-interactive-active hover:border-sf-border-interactive-active hover:bg-sf-surface-interactive-active hover:text-sf-text-interactive-active',
			inactive: '',
		},
	},
	defaultVariants: {
		state: 'inactive',
	},
})

export const mainCardSectionClass =
	'rounded-2xl border border-sf-border-subtle bg-card p-4 shadow-(--sf-shadow-panel)'

export const mainCardInlineActionsClass = 'flex shrink-0 items-center gap-2'
