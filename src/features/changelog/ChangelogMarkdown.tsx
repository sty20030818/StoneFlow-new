import type { ReactNode } from 'react'

export function ChangelogMarkdown({ content }: { content: string }) {
	const blocks = parseSimpleMarkdown(content)
	return (
		<div className='space-y-2.5 text-[13px] leading-6 text-foreground'>
			{blocks.map((block, index) => {
				if (block.type === 'h2') {
					return (
						<h3 className='m-0 text-[14px] font-semibold' key={index}>
							{renderInline(block.text)}
						</h3>
					)
				}
				if (block.type === 'h3') {
					return (
						<h4 className='m-0 text-[13px] font-semibold' key={index}>
							{renderInline(block.text)}
						</h4>
					)
				}
				if (block.type === 'list') {
					return (
						<ul className='m-0 space-y-1 p-0' key={index}>
							{block.items.map((item, itemIndex) => (
								<li className='flex items-start gap-2' key={itemIndex}>
									<span className='mt-2.25 size-1 shrink-0 rounded-full bg-foreground/40' />
									<span className='text-sf-shell-text-tertiary'>{renderInline(item)}</span>
								</li>
							))}
						</ul>
					)
				}
				return (
					<p className='m-0 text-sf-shell-text-tertiary' key={index}>
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
	| { type: 'list'; items: string[] }
	| { type: 'p'; text: string }

function parseSimpleMarkdown(content: string): MarkdownBlock[] {
	const blocks: MarkdownBlock[] = []
	let listItems: string[] = []
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
