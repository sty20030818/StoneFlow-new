// CommandMenu 列表行、分组与命令项渲染原语。

import type { ComponentType, ReactNode } from 'react'

import { Command } from '@heroui-pro/react'
import { Chip, Kbd } from '@heroui/react'
import { CheckIcon, FolderOpenIcon, FoldersIcon, MinusIcon, type LucideProps } from 'lucide-react'

import { ShortcutTokens } from '@/shared/components/ShortcutTokens'
import { OverflowTooltip } from '@/shared/components/tooltip'

import { buildCommandMenuGroups, type CommandMenuEntry } from './command-menu-model'
import { resolveCommandIcon } from './command-menu-helpers'
import type { CommandRowSelectionIndicator } from './command-menu-helpers'
import type { CommandMenuProject } from './CommandMenu'

export function CommandScrollableList({
	children,
	emptyText,
}: {
	children: React.ReactNode
	emptyText: string
}) {
	return (
		<Command.List aria-label='命令' className='max-h-120' renderEmptyState={() => emptyText}>
			{children}
		</Command.List>
	)
}

export function CommandMenuList({
	groups,
	onOpenChange,
}: {
	groups: ReturnType<typeof buildCommandMenuGroups>
	onOpenChange: (open: boolean) => void
}) {
	return (
		<>
			{groups.map((group) => (
				<CommandMenuGroup group={group} key={group.key} onOpenChange={onOpenChange} />
			))}
		</>
	)
}

function CommandMenuGroup({
	group,
	onOpenChange,
}: {
	group: ReturnType<typeof buildCommandMenuGroups>[number]
	onOpenChange: (open: boolean) => void
}) {
	return (
		<Command.Group className='pt-1 first:pt-0' heading={group.heading}>
			{group.entries.map((entry) => (
				<CommandMenuItem entry={entry} key={entry.id} onOpenChange={onOpenChange} />
			))}
		</Command.Group>
	)
}

function CommandMenuItem({
	entry,
	onOpenChange,
}: {
	entry: CommandMenuEntry
	onOpenChange: (open: boolean) => void
}) {
	return (
		<Command.Item
			id={entry.id}
			isDisabled={!entry.enabled}
			onAction={() => {
				onOpenChange(false)
				void entry.execute({ source: 'command-menu' })
			}}
			textValue={`${entry.label} ${entry.keywords?.join(' ') ?? ''}`}
		>
			<CommandRow
				leading={renderCommandIcon(resolveCommandIcon(entry.id))}
				title={entry.label}
				trailing={
					!entry.enabled && entry.disabledReason ? (
						<CommandRowMeta>{entry.disabledReason}</CommandRowMeta>
					) : (
						<CommandMenuShortcut shortcut={entry.shortcut} />
					)
				}
			/>
		</Command.Item>
	)
}

function CommandMenuShortcut({ shortcut }: { shortcut: CommandMenuEntry['shortcut'] }) {
	if (!shortcut) {
		return null
	}

	return <ShortcutTokens tokens={shortcut} />
}

export function ProjectsCommandGroup({
	onNavigateProject,
	projects,
}: {
	onNavigateProject: (projectId: string) => void
	projects: CommandMenuProject[]
}) {
	return (
		<Command.Group className='pt-4' heading='项目'>
			{projects.length === 0 ? (
				<Command.Item id='empty-projects' isDisabled textValue='当前 Space 还没有项目'>
					<CommandRow leading={renderCommandIcon(FolderOpenIcon)} title='当前 Space 还没有项目' />
				</Command.Item>
			) : (
				projects.map((project) => (
					<Command.Item
						id={`project:${project.id}`}
						key={project.id}
						onAction={() => onNavigateProject(project.id)}
						textValue={project.label}
					>
						<CommandRow
							leading={renderCommandIcon(FoldersIcon)}
							title={project.label}
							trailing={
								project.badge ? (
									<Chip
										className='ml-auto'
										color={getProjectStatusColor(project.badge)}
										size='sm'
										variant='soft'
									>
										<Chip.Label>{project.badge}</Chip.Label>
									</Chip>
								) : null
							}
						/>
					</Command.Item>
				))
			)}
		</Command.Group>
	)
}

function getProjectStatusColor(status: string) {
	switch (status.toLowerCase()) {
		case 'active':
			return 'accent' as const
		case 'paused':
			return 'warning' as const
		case 'blocked':
		case 'failed':
		case 'error':
			return 'danger' as const
		default:
			return 'default' as const
	}
}

export function CommandRow({
	leading,
	title,
	trailing,
}: {
	leading: ReactNode
	title: string
	trailing?: React.ReactNode
}) {
	return (
		<div className='flex w-full min-w-0 items-center gap-3'>
			<div className='flex size-4 shrink-0 items-center justify-center'>{leading}</div>
			<OverflowTooltip
				className='min-w-0 flex-1 text-[14px] font-medium text-foreground'
				content={title}
			>
				{title}
			</OverflowTooltip>
			<div className='ml-auto flex shrink-0 items-center justify-end'>{trailing}</div>
		</div>
	)
}

export function renderCommandIcon(Icon: ComponentType<LucideProps>) {
	return <Icon className='size-4 text-muted' />
}

export function CommandRowMeta({ children }: { children: React.ReactNode }) {
	return (
		<OverflowTooltip
			className='block max-w-48 text-right text-[12px] text-muted'
			content={children}
		>
			{children}
		</OverflowTooltip>
	)
}

export function CommandRowSelectionTrailing({
	digit,
	indicator,
}: {
	digit?: string
	indicator: CommandRowSelectionIndicator
}) {
	if (!digit && !indicator) {
		return null
	}

	return (
		<div className='flex items-center gap-2'>
			<span
				aria-hidden
				className='inline-flex size-3.5 shrink-0 items-center justify-center'
				data-indicator={indicator ?? 'none'}
				data-slot='command-row-selected-indicator'
			>
				{indicator === 'checked' ? (
					<CheckIcon className='size-3.5 text-muted' />
				) : indicator === 'mixed' ? (
					<MinusIcon className='size-3.5 text-muted' />
				) : null}
			</span>
			{digit ? <CommandRowDigitHint digit={digit} /> : null}
		</div>
	)
}

export function CommandRowDigitHint({ digit }: { digit: string }) {
	return (
		<Kbd variant='light'>
			<Kbd.Content>{digit}</Kbd.Content>
		</Kbd>
	)
}
