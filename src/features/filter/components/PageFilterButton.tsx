/**
 * 工具条「筛选」入口：打开 filter-picker 命令菜单。
 * 与命令面板 F 组「添加筛选」同一路径，依赖页级已注册的 PageFilterController。
 */
import { ListFilterIcon } from 'lucide-react'

import { useDialogStore } from '@/features/shell-dialogs'
import { Button } from '@/shared/components/base/button'

import { usePageFilterContext } from '../model/PageFilterProvider'

type PageFilterButtonProps = {
	/** 默认打开 root 维度选择 */
	className?: string
}

export function PageFilterButton({ className }: PageFilterButtonProps) {
	const pageFilter = usePageFilterContext()
	const openCommand = useDialogStore((state) => state.openCommand)
	const hasActive = pageFilter.state.hasActiveFilters

	return (
		<Button
			aria-label={hasActive ? '筛选（已启用）' : '筛选'}
			className={className}
			data-active={hasActive ? 'true' : undefined}
			onClick={() => {
				pageFilter.actions.openFilterPicker('root')
				openCommand('filter-picker', null, 'root')
			}}
			size='icon-sm'
			type='button'
			variant='outline'
		>
			<ListFilterIcon />
		</Button>
	)
}
