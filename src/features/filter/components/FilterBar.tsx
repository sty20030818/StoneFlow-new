'use client'

/**
 * 筛选公式条：chip（field 固定 / op·值可改）+ Clear（仅 dirty）+ Save。
 */
import { useLayoutEffect, useRef, useState } from 'react'
import { Button, Surface } from '@heroui/react'
import { PlusIcon } from 'lucide-react'

import { COMMAND_IDS, CommandActionTooltip } from '@/features/command'
import { cn } from '@/shared/lib/utils'

import {
	filterQueriesEqual,
	normalizeFilterQuery,
	type FilterClause,
	type FilterQuery,
} from '../core'
import { useListFilterUi } from '../model/ListFilterUiContext'
import { FilterClauseEditor } from './FilterClauseEditor'
import { FilterMenu } from './FilterMenu'

export function FilterBar({ className }: { className?: string }) {
	const { session, projects, onSave, focusFilterTrigger } = useListFilterUi()
	const [filterMenuOpen, setFilterMenuOpen] = useState(false)
	const [filterTooltipOpen, setFilterTooltipOpen] = useState(false)

	const { effective, dirty, clearTemp, replaceEffective } = session
	const wasDirty = useRef(dirty)
	const focusAfterRemoval = useRef<string | null>(null)
	useLayoutEffect(() => {
		// 子菜单也能改回基线；等工具条卸载后恢复失去的 DOM 焦点。
		if (wasDirty.current && !dirty && document.activeElement === document.body) focusFilterTrigger()
		if (
			focusAfterRemoval.current &&
			!effective.clauses.some((clause) => clause.id === focusAfterRemoval.current)
		) {
			focusFilterTrigger()
			focusAfterRemoval.current = null
		}
		wasDirty.current = dirty
	}, [dirty, effective, focusFilterTrigger])

	// Default / Saved View 是基线，不在工具条重复展示；只呈现真实 Filter Draft。
	if (!dirty) {
		return null
	}

	function removeClause(clauseId: string) {
		const next: FilterQuery = normalizeFilterQuery({
			clauses: effective.clauses.filter((c) => c.id !== clauseId),
		})
		focusFilterTrigger()
		replaceEffective(next)
	}

	function updateClause(nextClause: FilterClause) {
		const next: FilterQuery = normalizeFilterQuery({
			clauses: effective.clauses.map((c) => (c.id === nextClause.id ? nextClause : c)),
		})
		if (!next.clauses.some((clause) => clause.id === nextClause.id))
			focusAfterRemoval.current = nextClause.id
		if (filterQueriesEqual(next, session.base)) focusFilterTrigger()
		replaceEffective(next)
	}

	return (
		<div className={cn('flex flex-col gap-1.5', className)}>
			<Surface
				className='flex flex-wrap items-center gap-2 p-2'
				data-filter-bar='true'
				variant='secondary'
			>
				{effective.clauses.map((clause) => (
					<FilterClauseEditor
						clause={clause}
						key={clause.id}
						onRemove={() => removeClause(clause.id)}
						onUpdate={updateClause}
						projects={projects}
					/>
				))}
				<FilterMenu
					onOpenChange={(nextOpen) => {
						setFilterMenuOpen(nextOpen)
						if (nextOpen) {
							setFilterTooltipOpen(false)
						}
					}}
					open={filterMenuOpen}
					trigger={
						<CommandActionTooltip
							commandId={COMMAND_IDS.filterAdd}
							isOpen={filterTooltipOpen && !filterMenuOpen}
							label='添加筛选'
							onOpenChange={(nextOpen) => setFilterTooltipOpen(nextOpen && !filterMenuOpen)}
						>
							<Button aria-label='添加筛选' isIconOnly size='sm' type='button' variant='ghost'>
								<PlusIcon className='size-3.5' />
							</Button>
						</CommandActionTooltip>
					}
				/>
				<div className='ml-auto flex items-center gap-1.5'>
					<Button
						onPress={() => {
							focusFilterTrigger()
							clearTemp()
						}}
						size='sm'
						type='button'
						variant='ghost'
					>
						恢复
					</Button>
					{onSave ? (
						<Button onPress={onSave} size='sm' type='button' variant='outline'>
							保存
						</Button>
					) : null}
				</div>
			</Surface>
		</div>
	)
}
