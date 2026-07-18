import { useMemo } from 'react'

import {
	applyTaskDisplayOptionsToTasks,
	createTaskDisplayApplyContext,
	useTaskDisplayOptions,
} from '@/features/display-options'
import { useRegisterPageFilterController } from '@/features/filter'
import type { ProjectOption } from '@/features/project'
import type { TaskListItem } from '@/shared/types'

import { useTaskPageFilterController } from '../useTaskPageFilterController'
import type { VariantConfig } from './variantConfig'

type UseListSceneFilterDisplayArgs = {
	config: VariantConfig
	taskSourceItems: TaskListItem[]
	projectOptions: ProjectOption[]
}

/**
 * filter + display 注册与派生结果。
 */
export function useListSceneFilterDisplay({
	config,
	taskSourceItems,
	projectOptions,
}: UseListSceneFilterDisplayArgs) {
	const display = useTaskDisplayOptions(config.displayPageKey)

	const { controller, filteredTasks } = useTaskPageFilterController({
		tasks: taskSourceItems,
		projects: config.supportsProject ? projectOptions : undefined,
		capabilities: {
			supportsPriority: true,
			supportsStatus: true,
			supportsDate: true,
			supportsProject: config.supportsProject,
			supportsToggleCompleted: true,
			supportsClearAll: true,
		},
		...(config.initialShowCompleted === false ? { initialShowCompleted: false as const } : {}),
	})
	useRegisterPageFilterController(controller)

	const displayResult = useMemo(
		() =>
			applyTaskDisplayOptionsToTasks({
				items: filteredTasks,
				options: display.options,
				context: createTaskDisplayApplyContext(config.displayPageKey),
			}),
		[config.displayPageKey, display.options, filteredTasks],
	)

	return { controller, filteredTasks, displayResult }
}
