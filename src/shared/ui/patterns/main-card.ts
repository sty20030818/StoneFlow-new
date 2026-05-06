import { cva } from 'class-variance-authority'

/**
 * Main Card 自身属于产品模式层，承接页面常见的 pill / ghost action / section 容器。
 */
export const mainCardToolbarPillVariants = cva(
	'h-7.5 rounded-full px-3 shadow-none focus-visible:border-border focus-visible:bg-sf-surface-active focus-visible:text-foreground',
	{
		variants: {
			state: {
				active: 'border-sf-border-subtle bg-sf-surface-hover text-foreground',
				inactive: 'border-sf-border-subtle text-sf-text-secondary hover:bg-muted/60 hover:text-foreground',
			},
		},
		defaultVariants: {
			state: 'inactive',
		},
	},
)

export const mainCardGhostActionClass =
	'border-transparent bg-card text-muted-foreground shadow-none hover:bg-muted hover:text-foreground'

export const mainCardSectionClass =
	'rounded-2xl border border-sf-border-subtle bg-card p-4 shadow-(--sf-shadow-panel)'
