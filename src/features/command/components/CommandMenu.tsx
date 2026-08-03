import { useEffect, useMemo, useRef, useState } from 'react'

import {
	Command,
	CommandDialog,
	CommandEmpty,
	CommandInput,
} from '@/shared/components/base/command'
import { useGlobalSearch } from '@/features/global-search'
import { useDialogStore } from '@/features/shell-dialogs'
import type {
	CommandContext,
	CommandId,
	CommandRuntime,
	TaskPlacementTarget,
} from '@/features/command/core'
import type {
	SearchProjectItem,
	SearchTaskItem,
	Space,
	TaskPriority,
	TaskStatus,
} from '@/shared/types'

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
	className?: string
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
	onRunCommand: (id: CommandId) => void
	open: boolean
	projects: CommandMenuProject[]
	runtime: CommandRuntime
	spaces?: Space[]
	title: string
}

export function CommandMenu({
	className,
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
	onRunCommand,
	open,
	projects: projectLinks,
	runtime,
	spaces = EMPTY_SPACES,
	title,
}: CommandMenuProps) {
	const [query, setQuery] = useState('')
	const inputRef = useRef<HTMLInputElement>(null)
	const openCustomDateDialog = useDialogStore((state) => state.openCustomDateDialog)
	const groups = useMemo(() => buildCommandMenuGroups(runtime, context), [context, runtime])
	const scopedSearch = useGlobalSearch(isCommandMenuSearchMode(mode) ? query : '')
	const isScopedMode = mode !== 'default'

	useEffect(() => {
		setQuery('')
	}, [mode, open])

	useEffect(() => {
		if (!open) {
			return
		}

		requestAnimationFrame(() => {
			const input = inputRef.current
			if (!input) {
				return
			}

			if (document.activeElement !== input) {
				input.focus()
			}
			input.setSelectionRange(query.length, query.length)
		})
	}, [open, query.length])

	const handleSurfacePointerDownCapture = (event: React.PointerEvent<HTMLDivElement>) => {
		const target = event.target
		if (!(target instanceof HTMLElement)) {
			return
		}

		if (target.closest('[data-slot="command-input"]')) {
			return
		}

		requestAnimationFrame(() => {
			const input = inputRef.current
			if (!input) {
				return
			}

			if (document.activeElement !== input) {
				input.focus()
			}
			input.setSelectionRange(query.length, query.length)
		})
	}

	return (
		<CommandDialog
			className={className}
			description={description}
			onOpenChange={onOpenChange}
			open={open}
			title={title}
		>
			<Command
				onPointerDownCapture={handleSurfacePointerDownCapture}
				shouldFilter={!isCommandMenuSearchMode(mode)}
			>
				<div className='flex flex-col'>
					<CommandMenuSelectionChips entities={context.selection.entities} />
					<CommandInput
						ref={inputRef}
						placeholder={getCommandMenuPlaceholder(mode)}
						value={query}
						wrapperClassName='pr-2 pl-4 py-3'
						onValueChange={setQuery}
					/>
				</div>
				<CommandScrollableList>
					<CommandEmpty>{getCommandMenuEmptyText(mode, query)}</CommandEmpty>
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
							<CommandMenuList
								groups={groups}
								onOpenChange={onOpenChange}
								onRunCommand={onRunCommand}
							/>
							<ProjectsCommandGroup onNavigateProject={onNavigateProject} projects={projectLinks} />
						</>
					)}
				</CommandScrollableList>
			</Command>
		</CommandDialog>
	)
}
