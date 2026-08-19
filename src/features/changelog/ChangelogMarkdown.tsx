import ReactMarkdown, { type Components } from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'

const components: Components = {
	hr: () => null,
	h2: ({ children }) => (
		<h3 className='m-0 pt-1.5 text-[15px] font-semibold text-foreground'>{children}</h3>
	),
	h3: ({ children }) => (
		<h4 className='m-0 pt-1.5 text-[14px] font-semibold text-foreground'>{children}</h4>
	),
	ul: ({ children }) => (
		<ul className='m-0 list-disc space-y-1.5 pl-5 marker:text-muted'>{children}</ul>
	),
	p: ({ children }) => <p className='m-0 text-muted'>{children}</p>,
	pre: ({ children }) => (
		<pre className='m-0 overflow-x-auto rounded-md bg-surface-secondary px-3 py-2 font-mono text-xs text-muted'>
			{children}
		</pre>
	),
}

/** 发布记录只需标准 Markdown/GFM；原始 HTML 不执行，分割线按产品合同隐藏。 */
export function ChangelogMarkdown({ content }: { content: string }) {
	return (
		<div className='space-y-3.5 text-[13px] leading-6 text-muted'>
			<ReactMarkdown components={components} remarkPlugins={[remarkGfm, remarkBreaks]}>
				{content}
			</ReactMarkdown>
		</div>
	)
}
