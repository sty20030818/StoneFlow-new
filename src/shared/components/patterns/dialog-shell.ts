import { cva } from 'class-variance-authority'

/**
 * Dialog 壳层模式：统一内容面板、头部和底部结构。
 * 仅负责视觉骨架，不承载业务交互。
 */
export const dialogShellContentVariants = cva(
	'gap-0 border border-sf-border-secondary bg-popover p-0 shadow-(--sf-shadow-float)',
	{
		variants: {
			size: {
				lg: 'max-w-[calc(100%-1.5rem)] sm:max-w-lg',
				xl: 'max-w-[calc(100%-1.5rem)] sm:max-w-xl',
				xxl: 'max-w-[calc(100%-1.5rem)] sm:max-w-2xl',
				wide: 'max-w-3xl',
			},
		},
		defaultVariants: {
			size: 'xl',
		},
	},
)

export const dialogShellHeaderClass = 'gap-1.5 border-b border-sf-divider px-6 py-4 pr-14'
export const dialogShellBodyClass = 'px-6 py-5'
export const dialogShellFooterClass =
	'flex items-center justify-end gap-2 border-t border-sf-divider pt-3'
export const dialogShellPanelFooterClass = 'border-t border-sf-divider bg-muted/60 px-6 py-4'
export const dialogShellFloatingBaseClass = 'bg-popover p-0 shadow-(--sf-shadow-float)'
/** 低频信息阅读弹窗（更新记录、快捷键帮助、关于）的统一面板外壳。 */
export const dialogShellReadingClass =
	'top-[18%] translate-y-0 overflow-hidden rounded-lg border border-sf-border-subtle bg-background/98 p-0 text-popover-foreground shadow-(--sf-shadow-popover) max-sm:max-w-[calc(100%-1.5rem)] max-lg:max-w-[calc(100%-1.5rem)] sm:max-w-190'
export const dialogShellTitleClass =
	'text-[1.0625rem] font-semibold tracking-[-0.02em] text-foreground'
export const dialogShellDescriptionClass = 'text-[13px] leading-5 text-muted-foreground'
