import { useEffect, useId, useMemo, useState } from 'react'

import { Command } from '@heroui-pro/react'
import { SearchIcon } from 'lucide-react'
import { useGlobalSearch } from '@/features/global-search'
import { useDialogStore } from '@/features/shell-dialogs'
import type { CommandContext, CommandRuntime, TaskPlacementTarget } from '@/features/command/core'
import type {
	SearchProjectItem,
	SearchTaskItem,
	Space,
	TaskPriority,
	TaskStatus,
} from '@/shared/types'
import { useShortcutRegistry } from '@/features/command/shortcuts/shortcut-registry-context'

import { buildCommandMenuGroups } from './command-menu-model'
import { getCommandMenuEmptyText, getCommandMenuPlaceholder } from './command-menu-helpers'
import { CommandMenuSelectionChips } from './CommandMenuSelectionChips'
import {
	CommandMenuList,
	CommandScrollableList,
	ProjectsCommandGroup,
} from './CommandMenuListPrimitives'
import { ScopedPickerCommandGroup } from './ScopedPickerCommandGroup'
import { isCommandMenuSearchMode, type CommandMenuMode } from './command-menu-types'

export type { CommandMenuMode } from './command-menu-types'

// 模块级空数组常量，避免每次渲染都创建新的默认值引用
const EMPTY_SPACES: Space[] = []

export type CommandMenuProject = {
	id: string
	label: string
	badge?: string
	spaceId?: string
	spaceName?: string
	completedAt?: string | null
}

type CommandMenuProps = {
	context: CommandContext
	description: string
	mode: CommandMenuMode
	onNavigateProject: (projectId: string) => void
	onOpenChange: (open: boolean) => void
	onSelectProject: (project: SearchProjectItem) => void
	onSelectTaskPlacement: (target: TaskPlacementTarget) => void
	onSelectTask: (task: SearchTaskItem) => void
	onSelectTaskDate: (dueAt: string | null) => void
	onSelectTaskPriority: (priority: TaskPriority) => void
	onSelectTaskStatus: (status: TaskStatus) => void
	open: boolean
	projects: CommandMenuProject[]
	runtime: CommandRuntime
	spaces?: Space[]
	title: string
}

export function CommandMenu({
	context,
	description,
	mode,
	onNavigateProject,
	onOpenChange,
	onSelectProject,
	onSelectTaskPlacement,
	onSelectTask,
	onSelectTaskDate,
	onSelectTaskPriority,
	onSelectTaskStatus,
	open,
	projects: projectLinks,
	runtime,
	spaces = EMPTY_SPACES,
	title,
}: CommandMenuProps) {
	const [query, setQuery] = useState('')
	const descriptionId = useId()
	const shortcutRegistry = useShortcutRegistry()
	const openCustomDateDialog = useDialogStore((state) => state.openCustomDateDialog)
	const groups = useMemo(
		() => buildCommandMenuGroups(runtime, context, shortcutRegistry),
		[context, runtime, shortcutRegistry],
	)
	const scopedSearch = useGlobalSearch(isCommandMenuSearchMode(mode) ? query : '')
	const isScopedMode = mode !== 'default'

	useEffect(() => {
		setQuery('')
	}, [mode, open])

	return (
		<Command>
			<Command.Backdrop isDismissable isOpen={open} onOpenChange={onOpenChange}>
				<Command.Container size='lg'>
					<Command.Dialog
						aria-describedby={descriptionId}
						aria-label={title}
						filter={isCommandMenuSearchMode(mode) ? () => true : undefined}
						inputValue={query}
						onInputChange={setQuery}
					>
						<p className='sr-only' id={descriptionId}>
							{description}
						</p>
						<Command.Header>
							<CommandMenuSelectionChips entities={context.selection.entities} />
							<Command.InputGroup aria-label={getCommandMenuPlaceholder(mode)}>
								<Command.InputGroup.Prefix>
									<SearchIcon aria-hidden />
								</Command.InputGroup.Prefix>
								<Command.InputGroup.Input placeholder={getCommandMenuPlaceholder(mode)} />
								<Command.InputGroup.ClearButton aria-label='清空搜索' />
							</Command.InputGroup>
						</Command.Header>
						<CommandScrollableList emptyText={getCommandMenuEmptyText(mode, query)}>
							{isScopedMode ? (
								<ScopedPickerCommandGroup
									context={context}
									mode={mode}
									onOpenChange={onOpenChange}
									onSelectProject={onSelectProject}
									onSelectTaskPlacement={onSelectTaskPlacement}
									onSelectTask={onSelectTask}
									onSelectTaskDate={onSelectTaskDate}
									onSelectTaskPriority={onSelectTaskPriority}
									onSelectTaskStatus={onSelectTaskStatus}
									onOpenCustomDateDialog={openCustomDateDialog}
									projectLinks={projectLinks}
									result={scopedSearch.result}
									spaces={spaces}
								/>
							) : (
								<>
									<CommandMenuList groups={groups} onOpenChange={onOpenChange} />
									<ProjectsCommandGroup
										onNavigateProject={onNavigateProject}
										projects={projectLinks}
									/>
								</>
							)}
						</CommandScrollableList>
					</Command.Dialog>
				</Command.Container>
			</Command.Backdrop>
		</Command>
	)
}
