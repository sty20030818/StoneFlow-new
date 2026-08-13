import { cva } from 'class-variance-authority'

/**
 * 表单字段模式：统一 label + control + hint 的基础视觉。
 */
export const formFieldStackClass = 'flex flex-col gap-1.5'
export const formFieldGridClass = 'grid gap-1.5'
export const formFieldHintClass = 'mt-1 text-[12px] leading-5 text-sf-shell-text-tertiary'

export const formFieldLabelVariants = cva('text-[12px] font-medium', {
	variants: {
		tone: {
			default: 'text-legacy-foreground',
			muted: 'text-sf-text-secondary',
		},
	},
	defaultVariants: {
		tone: 'default',
	},
})
