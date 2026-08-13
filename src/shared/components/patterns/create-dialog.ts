import { cn } from '@/shared/lib/utils'

import { dialogShellFloatingBaseClass } from './dialog-shell'

/**
 * 创建弹窗壳层 — 浮动 Dialog 统一 className。
 * 顶留白 15dvh、底最多留白 15dvh → max-h = 视口 - 上下各 15dvh。
 */
export const createDialogShellClass = cn(
	'flex min-h-[30dvh] max-h-[70dvh] max-w-[calc(100%-1.5rem+8px)]',
	'flex-col gap-0 overflow-hidden rounded-3xl border border-legacy-border',
	'sm:max-w-3xl top-[15dvh] translate-y-0',
	dialogShellFloatingBaseClass,
)

export const createDialogShellFullscreenClass = cn(
	createDialogShellClass,
	'h-[70dvh] max-h-[70dvh]',
	'w-[min(72rem,calc(100vw-1.5rem))] sm:max-w-[min(72rem,calc(100vw-1.5rem))]',
)

/**
 * 短决策浮动壳（更新提醒等）：同族圆角/顶偏，无 create 表单的 min/max-h，宽度收成 md。
 */
export const createDialogCompactShellClass = cn(
	'flex flex-col gap-0 overflow-hidden rounded-3xl border border-legacy-border',
	'max-w-[calc(100%-1.5rem)] sm:max-w-md top-[15dvh] translate-y-0',
	dialogShellFloatingBaseClass,
)

/** 创建弹窗 Header — 面包屑 + 操作按钮 */
export const createDialogHeaderClass = 'flex shrink-0 items-center justify-between p-3'

/** 创建弹窗标题区 — 固定，不随描述滚动 */
export const createDialogSectionClass = 'shrink-0 px-4'

/** 创建弹窗描述区 — 可滚动 */
export const createDialogScrollClass = 'min-h-0 flex-1 overflow-y-auto px-5'

/** 创建弹窗元数据区 — 固定，含错误信息 */
export const createDialogMetaClass = 'shrink-0 space-y-1.5 px-3'

/** 创建弹窗底部操作栏 */
export const createDialogFooterClass = 'flex shrink-0 items-center justify-between px-3 pb-3 pt-2'
