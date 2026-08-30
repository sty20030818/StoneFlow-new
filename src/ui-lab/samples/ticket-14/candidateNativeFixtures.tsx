import { useState, type ComponentType, type ReactNode } from 'react'

import { Button, Label, ListBox, Tag, TagGroup } from '@heroui/react'
import { HoverCard, InlineSelect, Segment } from '@heroui-pro/react'

import {
	CANDIDATE_PRIORITY_OPTIONS,
	CANDIDATE_VIEW_OPTIONS,
	LABEL_OPTIONS,
} from '../sharedFixtureData'

function NativeFixture({ title, children }: { title: string; children: ReactNode }) {
	return (
		<div className='flex min-w-0 flex-col items-start gap-4 font-sans'>
			<div>
				<h3 className='text-base font-semibold'>{title}</h3>
				<p className='mt-1 text-sm leading-6 text-muted'>
					只使用锁定版本公开 API；没有候选专属 CSS、wrapper 或 Provider。
				</p>
			</div>
			{children}
		</div>
	)
}

function HoverCardNativeFixture() {
	return (
		<NativeFixture title='HoverCard → Task Preview'>
			<HoverCard closeDelay={200} openDelay={300}>
				<HoverCard.Trigger>
					<Button type='button' variant='ghost'>
						预览任务
					</Button>
				</HoverCard.Trigger>
				<HoverCard.Content placement='bottom start'>
					<HoverCard.Arrow />
					<div className='w-64 p-3'>
						<p className='text-sm font-medium'>整理 UI Lab 原生对照</p>
						<p className='mt-1 text-xs leading-5 text-muted'>工作区 › UI Lab · 中优先级</p>
					</div>
				</HoverCard.Content>
			</HoverCard>
			<p className='text-xs leading-5 text-muted'>
				用 Hover、Tab、Escape 检查延时、焦点与关闭路径。
			</p>
		</NativeFixture>
	)
}

function InlineSelectNativeFixture() {
	const [priority, setPriority] = useState('medium')

	return (
		<NativeFixture title='InlineSelect → Metadata'>
			<div className='flex items-center gap-2 text-sm'>
				<span>优先级</span>
				<InlineSelect
					aria-label='候选优先级'
					onChange={(key) => typeof key === 'string' && setPriority(key)}
					value={priority}
				>
					<InlineSelect.Trigger>
						<InlineSelect.Value />
						<InlineSelect.Indicator />
					</InlineSelect.Trigger>
					<InlineSelect.Popover>
						<ListBox>
							{CANDIDATE_PRIORITY_OPTIONS.map((option) => (
								<ListBox.Item id={option.value} key={option.value} textValue={option.label}>
									{option.label}
									<ListBox.ItemIndicator />
								</ListBox.Item>
							))}
						</ListBox>
					</InlineSelect.Popover>
				</InlineSelect>
			</div>
		</NativeFixture>
	)
}

function TagGroupNativeFixture() {
	const [selected, setSelected] = useState<Iterable<string>>(new Set(['bug', '123']))

	return (
		<NativeFixture title='TagGroup → Labels'>
			<TagGroup
				aria-label='候选任务标签'
				selectedKeys={selected}
				selectionMode='multiple'
				size='md'
				onSelectionChange={(keys) =>
					setSelected(keys === 'all' ? LABEL_OPTIONS.map(({ id }) => id) : Array.from(keys, String))
				}
			>
				<Label>任务标签</Label>
				<TagGroup.List>
					{LABEL_OPTIONS.map((option) => (
						<Tag id={option.id} key={option.id} textValue={option.label}>
							<span
								aria-hidden
								className='size-2.5 shrink-0 rounded-full'
								style={{ backgroundColor: option.color }}
							/>
							{option.label}
						</Tag>
					))}
				</TagGroup.List>
			</TagGroup>
		</NativeFixture>
	)
}

function SegmentNativeFixture() {
	const [selected, setSelected] = useState('all')

	return (
		<NativeFixture title='Segment → 简单单选视图切换'>
			<Segment
				aria-label='候选页面筛选'
				onSelectionChange={(key) => setSelected(String(key))}
				selectedKey={selected}
				size='sm'
				variant='ghost'
			>
				{CANDIDATE_VIEW_OPTIONS.map((option) => (
					<Segment.Item id={option.id} key={option.id}>
						{option.label}
					</Segment.Item>
				))}
			</Segment>
		</NativeFixture>
	)
}

export const TICKET_14_NATIVE_FIXTURES = {
	'candidate-hover-card': { label: 'HoverCard Candidate', Preview: HoverCardNativeFixture },
	'candidate-inline-select': {
		label: 'InlineSelect Candidate',
		Preview: InlineSelectNativeFixture,
	},
	'candidate-tag-group': { label: 'TagGroup Candidate', Preview: TagGroupNativeFixture },
	'candidate-segment': { label: 'Segment Candidate', Preview: SegmentNativeFixture },
} satisfies Record<string, { label: string; Preview: ComponentType }>
