import {
	createDialogFooterClass,
	createDialogMetaClass,
	createDialogScrollClass,
	createDialogSectionClass,
} from '@/shared/components/patterns/create-dialog'
import { AppScrollArea } from '@/shared/components/AppScrollArea'

/** 创建弹窗表单 layout 容器 */
function Root({ children }: { children: React.ReactNode }) {
	return <div className='flex min-h-0 flex-1 flex-col gap-1.5'>{children}</div>
}

/** 标题区 — 固定，不随描述滚动 */
function Title({ children }: { children: React.ReactNode }) {
	return <div className={createDialogSectionClass}>{children}</div>
}

/** 描述区 — 可滚动 */
function Body({ children }: { children: React.ReactNode }) {
	return (
		<AppScrollArea className='min-h-0 flex-1' viewportClassName={createDialogScrollClass}>
			{children}
		</AppScrollArea>
	)
}

/** 元数据区 — 固定，含可选错误信息 */
function Metadata({ children, error }: { children: React.ReactNode; error?: string | null }) {
	return (
		<div className={createDialogMetaClass}>
			<div className='flex flex-wrap items-center gap-1.5'>{children}</div>
			{error ? <p className='text-[12px] text-sf-danger-surface-text'>{error}</p> : null}
		</div>
	)
}

/** 底部操作栏 */
function Footer({ children }: { children: React.ReactNode }) {
	return <div className={createDialogFooterClass}>{children}</div>
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
})
