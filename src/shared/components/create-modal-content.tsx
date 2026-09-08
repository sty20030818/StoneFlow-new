import { Button, ScrollShadow } from '@heroui/react'
import { PaperclipIcon } from 'lucide-react'
import { useLayoutEffect, useRef } from 'react'

/** Header 由组合层提供，直接读写领域表单的当前 Space。 */
export type CreateModalHeaderProps = {
	selectedSpaceId: string
	onSelectSpace: (spaceId: string) => void
	disabled: boolean
}

/** 退出的创建会话不能用迟到的提交结果关闭新会话；已发出的写入不受影响。 */
export function useCreateSessionActive() {
	const active = useRef(true)
	useLayoutEffect(() => {
		active.current = true
		return () => {
			active.current = false
		}
	}, [])
	return active
}

/** 创建弹窗表单 layout 容器 */
function Root({ children }: { children: React.ReactNode }) {
	return <div className='flex min-h-0 flex-1 flex-col gap-3'>{children}</div>
}

/** 标题区 — 固定，不随描述滚动 */
function Title({ children }: { children: React.ReactNode }) {
	return <div className='shrink-0'>{children}</div>
}

/** 描述区 — 可滚动 */
function Body({ children }: { children: React.ReactNode }) {
	return (
		<ScrollShadow
			className='scrollbar min-h-0 flex-1 overflow-y-auto'
			data-create-description-viewport
		>
			{children}
		</ScrollShadow>
	)
}

/** 元数据区 — 固定 */
function Metadata({ children }: { children: React.ReactNode }) {
	return <div className='flex shrink-0 flex-wrap items-center gap-1.5'>{children}</div>
}

/** 提交反馈共用底栏位置；错误与成功计数分别按紧急 / 礼貌方式播报。 */
function Feedback({ error, children }: { error?: string | null; children?: React.ReactNode }) {
	return (
		<div className='min-w-0 flex-1 text-xs'>
			{error ? (
				<p role='alert' className='text-danger-on-surface'>
					{error}
				</p>
			) : null}
			<p aria-live='polite' className='tabular-nums text-muted'>
				{error ? null : children}
			</p>
		</div>
	)
}

/** 底部操作栏 */
function Footer({ children }: { children: React.ReactNode }) {
	return (
		<div className='flex shrink-0 flex-wrap items-center justify-between gap-3'>
			<Button
				aria-label='素材（暂未开放）'
				isDisabled
				isIconOnly
				size='sm'
				type='button'
				variant='outline'
			>
				<PaperclipIcon className='size-3.5' />
			</Button>
			{children}
		</div>
	)
}

/** 描述只由外层 viewport 滚动；同一测量路径也覆盖窗口与放大后的换行变化。 */
export function useCreateDescriptionSize(value: string | undefined) {
	const ref = useRef<HTMLTextAreaElement>(null)
	useLayoutEffect(() => {
		resizeDescription(ref.current)
	}, [value])
	useLayoutEffect(() => {
		const textarea = ref.current
		if (!textarea) return
		let width = textarea.clientWidth
		const observer = new ResizeObserver(() => {
			if (textarea.clientWidth === width) return
			width = textarea.clientWidth
			resizeDescription(textarea)
		})
		observer.observe(textarea)
		return () => observer.disconnect()
	}, [])
	return ref
}

function resizeDescription(textarea: HTMLTextAreaElement | null) {
	if (!textarea) return
	const viewport = textarea.closest('[data-create-description-viewport]')
	const scrollTop = viewport?.scrollTop ?? 0
	textarea.style.height = 'auto'
	textarea.style.height = `${textarea.scrollHeight}px`
	if (viewport) viewport.scrollTop = scrollTop
}

/**
 * 创建弹窗表单 layout — 组合式组件。
 * 提供标题 / 描述 / 元数据 / 底栏 四分区骨架，业务组件只填充内容。
 */
export const CreateModalContent = Object.assign(Root, {
	Title,
	Body,
	Metadata,
	Footer,
	Feedback,
})
