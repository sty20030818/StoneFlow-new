import type { LifecycleMode } from '@/shared/types'
import { AppBreadcrumb } from '@/shared/components/AppBreadcrumb'
import { PageFrame } from '@/shared/components/page-frame'

import { useLifecycleScene } from '../hooks/useLifecycleScene'
import { LifecycleBoard } from './LifecycleBoard'

type LifecycleListProps = {
	mode: LifecycleMode
}

/**
 * 归档/回收站列表页：组合页面框架与生命周期集合。
 * wiring 在 {@link useLifecycleScene}。
 */
export function LifecycleList({ mode }: LifecycleListProps) {
	const scene = useLifecycleScene(mode)

	return (
		<PageFrame.Root>
			<PageFrame.Header breadcrumb={<AppBreadcrumb items={scene.breadcrumbItems} />} />
			<PageFrame.Toolbar pills={scene.toolbarPills} />
			<PageFrame.Body>
				<LifecycleBoard {...scene.lifecycleBoardProps} />
			</PageFrame.Body>
		</PageFrame.Root>
	)
}
