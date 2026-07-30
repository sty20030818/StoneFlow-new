import type { ReactNode } from 'react'

export function ChangelogMarkdown({ content }: { content: string }) {
	const blocks = parseSimpleMarkdown(content)
	return (
		<div className='space-y-3.5 text-[13px] leading-6 text-sf-text-secondary'>
			{blocks.map((block, index) => {
				if (block.type === 'h2') {
					return (
						<h3 className='m-0 pt-1.5 text-[15px] font-semibold text-sf-text-primary' key={index}>
							{renderInline(block.text)}
						</h3>
					)
				}
				if (block.type === 'h3') {
					return (
						<h4 className='m-0 pt-1.5 text-[14px] font-semibold text-sf-text-primary' key={index}>
							{renderInline(block.text)}
						</h4>
					)
				}
				if (block.type === 'list') {
					return (
						<ul className='m-0 space-y-1.5 p-0' key={index}>
							{block.items.map((item, itemIndex) => (
								<li
									className={
										item.level === 0
											? itemIndex > 0 && block.items[itemIndex - 1].level > 0
												? 'mt-2.5 flex items-start gap-2'
												: 'flex items-start gap-2'
											: item.level === 1
												? 'ml-5 flex items-start gap-2'
												: 'ml-10 flex items-start gap-2'
									}
									key={itemIndex}
								>
									<span
										className={
											item.level === 0
												? 'mt-2.25 size-1 shrink-0 rounded-full bg-sf-text-tertiary'
												: 'mt-2.5 h-px w-1.5 shrink-0 bg-sf-text-quaternary'
										}
									/>
									<span className='text-sf-text-secondary'>{renderInline(item.text)}</span>
								</li>
							))}
						</ul>
					)
				}
				return (
					<p className='m-0 text-sf-text-secondary' key={index}>
						{renderInline(block.text)}
					</p>
				)
			})}
		</div>
	)
}

type MarkdownBlock =
	| { type: 'h2'; text: string }
	| { type: 'h3'; text: string }
	| { type: 'list'; items: MarkdownListItem[] }
	| { type: 'p'; text: string }

type MarkdownListItem = {
	level: number
	text: string
}

function parseSimpleMarkdown(content: string): MarkdownBlock[] {
	const blocks: MarkdownBlock[] = []
	let listItems: MarkdownListItem[] = []
	let paragraph: string[] = []
	const flushParagraph = () => {
		if (paragraph.length) {
			blocks.push({ type: 'p', text: paragraph.join(' ').trim() })
			paragraph = []
		}
	}
	const flushList = () => {
		if (listItems.length) {
			blocks.push({ type: 'list', items: listItems })
			listItems = []
		}
	}
	for (const rawLine of content.split('\n')) {
		const line = rawLine.trimEnd()
		if (/^ {0,3}(-{3,}|_{3,}|\*{3,})\s*$/.test(line)) {
			flushParagraph()
			flushList()
			continue
		}
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
		const listMatch = line.match(/^(\s*)[-*]\s+(.+)$/)
		if (listMatch) {
			flushParagraph()
			listItems.push({
				level: Math.min(Math.floor(listMatch[1].replaceAll('\t', '  ').length / 2), 2),
				text: listMatch[2].trim(),
			})
			continue
		}
		if (!line.trim()) {
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
	while ((match = regex.exec(text)) !== null) {
		if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index))
		parts.push(<strong key={match.index}>{match[1]}</strong>)
		lastIndex = regex.lastIndex
	}
	if (lastIndex < text.length) parts.push(text.slice(lastIndex))
	return parts
}
