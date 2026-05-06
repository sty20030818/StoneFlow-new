/**
 * Quick Capture 页面模式：
 * - 命令面板外壳
 * - 顶部搜索输入容器
 * - 元信息 token 标签
 */
export const quickCaptureSurfaceClass =
	'flex h-full min-h-0 w-full flex-col overflow-hidden rounded-xl border border-sf-border-secondary bg-card text-foreground'

export const quickCaptureSearchInputShellClass =
	'flex h-9 flex-1 items-center gap-2 rounded-md border border-input bg-card px-3 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/14'

export const quickCaptureMetaPillClass =
	'rounded-md border border-border bg-card px-2.5 py-1 text-[12px] text-sf-text-secondary'

export const quickCaptureTypePillClass =
	'rounded-md border border-sf-border-subtle bg-muted/70 px-1.5 py-0.5 text-[11px] text-sf-text-quaternary'

export const quickCaptureStatePanelClass =
	'flex items-center gap-2 rounded-lg border border-sf-border-subtle bg-muted/60 px-3.5 py-3 text-center text-[12.5px] text-sf-text-quaternary'
