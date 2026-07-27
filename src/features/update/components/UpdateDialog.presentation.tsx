/**
 * UpdateDialog 纯展示：changelog markdown 解析与渲染。
 * 容器负责 store / 动作接线；本文件无副作用。
 */

import type { ReactNode } from 'react'

export function UpdateNotesMarkdown({ content }: { content: string }) {
	const blocks = parseSimpleMarkdown(content)
	return (
		<div className='text-[13px] leading-6 text-foreground space-y-2.5'>
			{blocks.map((block) => {
				if (block.type === 'h2') {
					return (
						<h3 key={`h2-${block.text}`} className='text-[14px] font-semibold text-foreground m-0'>
							{renderInline(block.text)}
						</h3>
					)
				}
				if (block.type === 'h3') {
					return (
						<h4 key={`h3-${block.text}`} className='text-[13px] font-semibold text-foreground m-0'>
							{renderInline(block.text)}
						</h4>
					)
				}
				if (block.type === 'list') {
					return (
						<ul key={`list-${block.items.join('|')}`} className='list-none m-0 p-0 space-y-1'>
							{block.items.map((item, j) => (
								<li key={j} className='flex items-start gap-2'>
									<span className='mt-2.25 size-1 shrink-0 rounded-full bg-foreground/40' />
									<span className='text-sf-shell-text-tertiary'>{renderInline(item)}</span>
								</li>
							))}
						</ul>
					)
				}
				return (
					<p key={`p-${block.text}`} className='m-0 text-sf-shell-text-tertiary'>
						{renderInline(block.text)}
					</p>
				)
			})}
		</div>
	)
}

function parseSimpleMarkdown(content: string): MarkdownBlock[] {
	const lines = content.split('\n')
	const blocks: MarkdownBlock[] = []
	let listItems: string[] = []
	let paragraph: string[] = []

	function flushParagraph() {
		if (paragraph.length > 0) {
			blocks.push({ type: 'p', text: paragraph.join(' ').trim() })
			paragraph = []
		}
	}
	function flushList() {
		if (listItems.length > 0) {
			blocks.push({ type: 'list', items: listItems })
			listItems = []
		}
	}

	for (const rawLine of lines) {
		const line = rawLine.trimEnd()
		if (line.startsWith('## ')) {
			flushParagraph()
			flushList()
			blocks.push({ type: 'h2', text: line.slice(3).trim() })
			continue
		}
		if (line.startsWith('### ')) {
			flushParagraph()
			flushList()
			blocks.push({ type: 'h3', text: line.slice(4).trim() })
			continue
		}
		if (line.startsWith('- ') || line.startsWith('* ')) {
			flushParagraph()
			listItems.push(line.slice(2).trim())
			continue
		}
		if (line.trim() === '') {
			flushParagraph()
			flushList()
			continue
		}
		flushList()
		paragraph.push(line.trim())
	}
	flushParagraph()
	flushList()
	return blocks
}

function renderInline(text: string): ReactNode {
	const parts: ReactNode[] = []
	const regex = /\*\*(.+?)\*\*/g
	let lastIndex = 0
	let match: RegExpExecArray | null
	let key = 0
	while ((match = regex.exec(text)) !== null) {
		if (match.index > lastIndex) {
			parts.push(text.slice(lastIndex, match.index))
		}
		parts.push(<strong key={key++}>{match[1]}</strong>)
		lastIndex = regex.lastIndex
	}
	if (lastIndex < text.length) {
		parts.push(text.slice(lastIndex))
	}
	return parts
}

type MarkdownBlock =
	| { type: 'h2'; text: string }
	| { type: 'h3'; text: string }
	| { type: 'list'; items: string[] }
	| { type: 'p'; text: string }
