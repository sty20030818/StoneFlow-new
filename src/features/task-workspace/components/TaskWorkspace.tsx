import type { ReactNode } from 'react'

import { DisplayOptionsButton, type TaskDisplayPageKey } from '@/features/display-options'
import {
	FilterBar,
	ListFilterUiProvider,
	PageFilterButton,
	type ListFilterUiValue,
} from '@/features/filter'
import { PageFrame } from '@/shared/components/page-frame'

type TaskWorkspaceProps = {
	breadcrumb: ReactNode
	headerActions: ReactNode
	views: Array<{ key: string; label: string }>
	selectedViewKey: string
	onViewChange: (key: string) => void
	displayPageKey: TaskDisplayPageKey
	filterUiValue: ListFilterUiValue
	children: ReactNode
}

/** Task 结果页的唯一 PageFrame 组合。 */
export function TaskWorkspace({
	breadcrumb,
	headerActions,
	views,
	selectedViewKey,
	onViewChange,
	displayPageKey,
	filterUiValue,
	children,
}: TaskWorkspaceProps) {
	return (
		<ListFilterUiProvider value={filterUiValue}>
			<PageFrame.Root>
				<PageFrame.Header actions={headerActions} breadcrumb={breadcrumb} />
				<PageFrame.Toolbar
					displayAction={<DisplayOptionsButton pageKey={displayPageKey} />}
					filterAction={<PageFilterButton />}
					filterBar={<FilterBar />}
					onSelectionChange={onViewChange}
					pills={views}
					selectedKey={selectedViewKey}
				/>
				<PageFrame.CollectionBody>{children}</PageFrame.CollectionBody>
			</PageFrame.Root>
		</ListFilterUiProvider>
	)
}
