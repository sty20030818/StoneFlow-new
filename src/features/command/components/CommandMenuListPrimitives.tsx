// CommandMenu 列表行、分组与命令项渲染原语。

import type { ComponentType, ReactNode } from 'react'

import { CheckIcon, FolderOpenIcon, FoldersIcon, MinusIcon, type LucideProps } from 'lucide-react'

import { AppScrollArea } from '@/shared/components/AppScrollArea'
import { ShortcutTokens } from '@/shared/components/ShortcutTokens'
import { Badge } from '@/shared/components/base/badge'
import { Kbd } from '@/shared/components/base/kbd'
import { CommandGroup, CommandItem, CommandList } from '@/shared/components/base/command'
import { getProjectStatusBadgeVariant } from '@/shared/components/badgeSemantics'
import { OverflowTooltip } from '@/shared/components/tooltip'
import type { CommandId } from '@/features/command/core'

import { buildCommandMenuGroups, type CommandMenuEntry } from './command-menu-model'
import { resolveCommandIcon } from './command-menu-helpers'
import type { CommandRowSelectionIndicator } from './command-menu-helpers'
import type { CommandMenuProject } from './CommandMenu'

export function CommandScrollableList({ children }: { children: React.ReactNode }) {
	return (
		<AppScrollArea
			className='max-h-120'
			minThumbHeight={48}
			thumbLengthRatio={0.58}
			trackInsetBottom={8}
			trackInsetTop={4}
			viewportClassName='px-1 pb-2'
		>
			<CommandList className='max-h-none scroll-py-2 overflow-x-hidden overflow-y-visible outline-none'>
				{children}
			</CommandList>
		</AppScrollArea>
	)
}

export function CommandMenuList({
	groups,
	onOpenChange,
	onRunCommand,
}: {
	groups: ReturnType<typeof buildCommandMenuGroups>
	onOpenChange: (open: boolean) => void
	onRunCommand: (id: CommandId) => void
}) {
	return (
		<>
			{groups.map((group) => (
				<CommandMenuGroup
					group={group}
					key={group.key}
					onOpenChange={onOpenChange}
					onRunCommand={onRunCommand}
				/>
			))}
		</>
	)
}

function CommandMenuGroup({
	group,
	onOpenChange,
	onRunCommand,
}: {
	group: ReturnType<typeof buildCommandMenuGroups>[number]
	onOpenChange: (open: boolean) => void
	onRunCommand: (id: CommandId) => void
}) {
	return (
		<CommandGroup className='pt-1 first:pt-0' heading={group.heading}>
			{group.entries.map((entry) => (
				<CommandMenuItem
					entry={entry}
					key={entry.command.id}
					onOpenChange={onOpenChange}
					onRunCommand={onRunCommand}
				/>
			))}
		</CommandGroup>
	)
}

function CommandMenuItem({
	entry,
	onOpenChange,
	onRunCommand,
}: {
	entry: CommandMenuEntry
	onOpenChange: (open: boolean) => void
	onRunCommand: (id: CommandId) => void
}) {
	return (
		<CommandItem
			disabled={entry.disabled}
			onSelect={() => {
				if (entry.disabled) {
					return
				}
				onOpenChange(false)
				onRunCommand(entry.command.id)
			}}
			value={`${entry.command.title} ${entry.command.keywords?.join(' ') ?? ''}`}
		>
			<CommandRow
				leading={renderCommandIcon(resolveCommandIcon(entry.command.id))}
				title={entry.command.title}
				trailing={
					entry.disabled && entry.disabledReason ? (
						<CommandRowMeta>{entry.disabledReason}</CommandRowMeta>
					) : (
						<CommandMenuShortcut shortcut={entry.shortcut} />
					)
				}
			/>
		</CommandItem>
	)
}

function CommandMenuShortcut({ shortcut }: { shortcut: CommandMenuEntry['shortcut'] }) {
	if (!shortcut) {
		return null
	}

	return (
		<ShortcutTokens
			kbdClassName='h-6 min-w-6 rounded-sm border border-sf-border-subtle bg-legacy-background/90 px-1.5 text-[11px] text-sf-text-secondary'
			separatorClassName='text-sf-text-quaternary'
			tokens={shortcut}
		/>
	)
}

export function ProjectsCommandGroup({
	onNavigateProject,
	projects,
}: {
	onNavigateProject: (projectId: string) => void
	projects: CommandMenuProject[]
}) {
	return (
		<CommandGroup className='pt-4' heading='项目'>
			{projects.length === 0 ? (
				<CommandItem disabled value='empty-projects'>
					<CommandRow leading={renderCommandIcon(FolderOpenIcon)} title='当前 Space 还没有项目' />
				</CommandItem>
			) : (
				projects.map((project) => (
					<CommandItem
						key={project.id}
						onSelect={() => onNavigateProject(project.id)}
						value={project.label}
					>
						<CommandRow
							leading={renderCommandIcon(FoldersIcon)}
							title={project.label}
							trailing={
								project.badge ? (
									<Badge
										className='ml-auto h-5 rounded-full px-2 text-[10.5px]'
										variant={getProjectStatusBadgeVariant(project.badge)}
									>
										{project.badge}
									</Badge>
								) : null
							}
						/>
					</CommandItem>
				))
			)}
		</CommandGroup>
	)
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
				className='min-w-0 flex-1 text-[14px] font-medium text-legacy-foreground'
				content={title}
			>
				{title}
			</OverflowTooltip>
			<div className='ml-auto flex shrink-0 items-center justify-end'>{trailing}</div>
		</div>
	)
}

export function renderCommandIcon(Icon: ComponentType<LucideProps>) {
	return <Icon className='size-4 text-sf-icon-secondary' />
}

export function CommandRowMeta({ children }: { children: React.ReactNode }) {
	return (
		<OverflowTooltip
			className='block max-w-48 text-right text-[12px] text-sf-text-tertiary'
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
					<CheckIcon className='size-3.5 text-sf-icon-secondary' />
				) : indicator === 'mixed' ? (
					<MinusIcon className='size-3.5 text-sf-icon-secondary' />
				) : null}
			</span>
			{digit ? <CommandRowDigitHint digit={digit} /> : null}
		</div>
	)
}

export function CommandRowDigitHint({ digit }: { digit: string }) {
	return (
		<Kbd className='h-6 min-w-6 rounded-sm border border-sf-border-subtle bg-legacy-background/90 px-1.5 text-[11px] text-sf-text-secondary'>
			{digit}
		</Kbd>
	)
}
